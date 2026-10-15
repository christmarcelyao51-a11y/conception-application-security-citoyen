from django.contrib import admin
from django.urls import path
from operations import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", views.health),
    path("api/operations", views.operations),
    path("api/operator/session", views.operator_session),
]
