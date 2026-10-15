from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from operations.models import Operator


SERVICES = ("police", "gendarmerie", "samu", "pompiers", "ccdo", "autre")


class Command(BaseCommand):
    help = "Creates local demo operator accounts for each emergency service."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo operator accounts can only be created when DJANGO_DEBUG=true.")
        encoded_password = make_password("demo2026")
        for service_id in SERVICES:
            Operator.objects.get_or_create(
                service_id=service_id,
                username="operateur",
                defaults={"display_name": "Opérateur de démonstration", "password": encoded_password},
            )
        self.stdout.write(self.style.SUCCESS("Demo operator accounts are ready for all services."))
