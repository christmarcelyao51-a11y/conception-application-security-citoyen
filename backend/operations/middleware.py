from django.conf import settings
from django.http import HttpResponse


class ApiCorsMiddleware:
    """Allow browser API calls only from the configured frontend origins."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allowed = origin in settings.FRONTEND_ORIGINS
        if request.method == "OPTIONS" and request.path.startswith("/api/"):
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if allowed and request.path.startswith("/api/"):
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response["Access-Control-Max-Age"] = "600"
            response["Vary"] = "Origin"
        return response
