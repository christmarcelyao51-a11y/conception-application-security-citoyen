import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone
from .models import OperatorSession

SESSION_LIFETIME = timedelta(hours=12)


def issue_operator_token(operator):
    raw_token = secrets.token_urlsafe(36)
    OperatorSession.objects.create(
        operator=operator,
        token_digest=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=timezone.now() + SESSION_LIFETIME,
    )
    return raw_token


def operator_from_request(request):
    header = request.headers.get("Authorization", "")
    scheme, _, raw_token = header.partition(" ")
    if scheme.lower() != "bearer" or not raw_token:
        return None, None
    digest = hashlib.sha256(raw_token.encode()).hexdigest()
    session = OperatorSession.objects.select_related("operator").filter(
        token_digest=digest, expires_at__gt=timezone.now(), operator__is_active=True
    ).first()
    return (session.operator, session) if session else (None, None)
