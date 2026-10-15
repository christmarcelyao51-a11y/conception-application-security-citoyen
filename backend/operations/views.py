import json
import math

from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .auth import issue_operator_token, operator_from_request
from .models import EmergencyOperation, Operator

VALID_SERVICES = {"police", "gendarmerie", "samu", "pompiers", "ccdo", "protection-civile", "autre"}
VALID_STATUSES = {"envoyee", "en-route", "sur-place", "cloturee", "annulee"}


def json_body(request):
    try:
        value = json.loads(request.body or b"{}")
        return value if isinstance(value, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def error(message, status):
    return JsonResponse({"error": message}, status=status)


def valid_position(value):
    if not isinstance(value, dict):
        return False
    try:
        lat, lng = float(value["lat"]), float(value["lng"])
        return math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180
    except (KeyError, TypeError, ValueError):
        return False


def health(_request):
    return JsonResponse({"status": "ok", "service": "security-citoyen-api"})


@csrf_exempt
@require_http_methods(["GET", "POST", "PATCH"])
def operations(request):
    if request.method == "GET":
        operation_id = request.GET.get("id")
        if operation_id:
            item = EmergencyOperation.objects.filter(pk=operation_id).first()
            if not item:
                return error("Demande introuvable.", 404)
            return JsonResponse({key: item.as_payload().get(key) for key in ("id", "status", "statusUpdatedAt", "assignedTo")})
        operator, _ = operator_from_request(request)
        if not operator:
            return error("Connexion opérateur requise.", 401)
        rows = EmergencyOperation.objects.filter(service_id=operator.service_id)
        return JsonResponse([item.as_payload() for item in rows], safe=False)

    if request.method == "POST":
        body = json_body(request)
        if not body:
            return error("Corps JSON invalide.", 400)
        station = body.get("station")
        if (
            not isinstance(body.get("id"), str) or not body["id"] or len(body["id"]) > 128
            or body.get("serviceId") not in VALID_SERVICES
            or not isinstance(body.get("createdAt"), (int, float))
            or not valid_position(body.get("userPosition"))
            or not isinstance(station, dict) or not valid_position(station.get("position"))
            or body.get("status") != "envoyee"
        ):
            return error("Données de demande incomplètes.", 400)
        item, created = EmergencyOperation.objects.update_or_create(
            pk=body["id"],
            defaults={
                "service_id": body["serviceId"], "status": "envoyee",
                "created_at_ms": int(body["createdAt"]),
                "status_updated_at_ms": int(body.get("statusUpdatedAt") or body["createdAt"]),
                "assigned_to": "", "payload": body,
            },
        )
        return JsonResponse(item.as_payload(), status=201 if created else 200)

    body = json_body(request)
    if not body or not isinstance(body.get("id"), str) or body.get("status") not in VALID_STATUSES:
        return error("Mise à jour invalide.", 400)
    operator, _ = operator_from_request(request)
    next_status = body["status"]
    if not operator and next_status != "annulee":
        return error("Connexion opérateur requise.", 401)
    with transaction.atomic():
        item = EmergencyOperation.objects.select_for_update().filter(pk=body["id"]).first()
        if not item or (operator and item.service_id != operator.service_id):
            return error("Demande introuvable pour ce service.", 404)
        if next_status == "en-route":
            if item.status != "envoyee":
                return error("Cette demande a déjà été prise en charge ou son statut a changé.", 409)
            item.assigned_to = operator.display_name
        elif next_status == "sur-place" and item.status != "en-route":
            return error("Transition de statut invalide.", 409)
        elif next_status == "cloturee" and item.status != "sur-place":
            return error("Transition de statut invalide.", 409)
        elif next_status == "annulee" and item.status in {"cloturee", "annulee"}:
            return error("Cette demande ne peut plus être annulée.", 409)
        item.status = next_status
        item.status_updated_at_ms = int(timezone.now().timestamp() * 1000)
        item.save(update_fields=["status", "status_updated_at_ms", "assigned_to"])
    return JsonResponse(item.as_payload())


@csrf_exempt
@require_http_methods(["GET", "POST", "DELETE"])
def operator_session(request):
    if request.method == "POST":
        body = json_body(request)
        if not body:
            return error("Identifiants invalides.", 400)
        service_id = body.get("serviceId")
        username = str(body.get("identifier", "")).strip()
        password = str(body.get("password", ""))
        operator = Operator.objects.filter(username=username, service_id=service_id, is_active=True).first()
        if not operator or not check_password(password, operator.password):
            return error("Service ou identifiants incorrects.", 401)
        token = issue_operator_token(operator)
        return JsonResponse({"serviceId": operator.service_id, "name": operator.display_name, "token": token})
    operator, session = operator_from_request(request)
    if not operator:
        return error("Session opérateur expirée.", 401)
    if request.method == "DELETE":
        session.delete()
        return JsonResponse({"success": True})
    return JsonResponse({"serviceId": operator.service_id, "name": operator.display_name})
