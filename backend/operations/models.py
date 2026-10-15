from django.db import models


class EmergencyOperation(models.Model):
    id = models.CharField(primary_key=True, max_length=128)
    service_id = models.CharField(max_length=32, db_index=True)
    status = models.CharField(max_length=24, db_index=True)
    created_at_ms = models.BigIntegerField(db_index=True)
    status_updated_at_ms = models.BigIntegerField(null=True, blank=True)
    assigned_to = models.CharField(max_length=160, blank=True)
    payload = models.JSONField()

    class Meta:
        ordering = ["-created_at_ms"]

    def as_payload(self):
        return {
            **self.payload,
            "id": self.pk,
            "serviceId": self.service_id,
            "status": self.status,
            "statusUpdatedAt": self.status_updated_at_ms,
            "assignedTo": self.assigned_to or None,
        }


class Operator(models.Model):
    service_id = models.CharField(max_length=32, db_index=True)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=128)
    display_name = models.CharField(max_length=160)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["service_id", "username"], name="unique_operator_per_service")]

    def __str__(self):
        return f"{self.username} ({self.service_id})"


class OperatorSession(models.Model):
    operator = models.ForeignKey(Operator, on_delete=models.CASCADE, related_name="sessions")
    token_digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session {self.operator.username}"
