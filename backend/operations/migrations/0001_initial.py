from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Operator",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service_id", models.CharField(db_index=True, max_length=32)),
                ("username", models.CharField(max_length=100, unique=True)),
                ("password", models.CharField(max_length=128)),
                ("display_name", models.CharField(max_length=160)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="EmergencyOperation",
            fields=[
                ("id", models.CharField(max_length=128, primary_key=True, serialize=False)),
                ("service_id", models.CharField(db_index=True, max_length=32)),
                ("status", models.CharField(db_index=True, max_length=24)),
                ("created_at_ms", models.BigIntegerField(db_index=True)),
                ("status_updated_at_ms", models.BigIntegerField(blank=True, null=True)),
                ("assigned_to", models.CharField(blank=True, max_length=160)),
                ("payload", models.JSONField()),
            ],
            options={"ordering": ["-created_at_ms"]},
        ),
        migrations.CreateModel(
            name="OperatorSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token_digest", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("operator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sessions", to="operations.operator")),
            ],
        ),
    ]
