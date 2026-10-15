from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("operations", "0001_initial")]
    operations = [
        migrations.AlterField(
            model_name="operator",
            name="username",
            field=models.CharField(max_length=100),
        ),
        migrations.AddConstraint(
            model_name="operator",
            constraint=models.UniqueConstraint(
                fields=("service_id", "username"),
                name="unique_operator_per_service",
            ),
        ),
    ]
