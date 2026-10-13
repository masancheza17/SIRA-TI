"""
Comando de gestión: seed_data

Crea los datos iniciales indispensables para probar SIRA TI de punta
a punta: roles, un usuario administrador, catálogos de tickets
(categorías, prioridades, estados), SLA por prioridad, un servicio de
ejemplo, un técnico y un cliente con sus respectivos usuarios, y un
ticket de ejemplo con un comentario.

Uso:
    python manage.py seed_data
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.clients.models import Client
from apps.services.models import Service
from apps.sla.models import SLA
from apps.technicians.models import Technician
from apps.tickets.models import Category, Comment, Priority, Status, Ticket
from apps.users.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = "Crea datos iniciales de SIRA TI (roles, catálogos, SLA, usuarios de prueba y un ticket demo)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Creando datos iniciales de SIRA TI...")

        # --- Roles ---------------------------------------------------
        role_admin, _ = Role.objects.get_or_create(
            name=Role.ADMIN, defaults={"description": "Administra todo el sistema"}
        )
        role_tech, _ = Role.objects.get_or_create(
            name=Role.TECHNICIAN, defaults={"description": "Gestiona tickets asignados"}
        )
        role_client, _ = Role.objects.get_or_create(
            name=Role.CLIENT, defaults={"description": "Crea y consulta sus propios tickets"}
        )

        # --- Usuarios de prueba ---------------------------------------
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@sira-ti.local",
                "first_name": "Administrador",
                "last_name": "SIRA TI",
                "role": role_admin,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("Admin123*")
            admin_user.save()

        tech_user, created = User.objects.get_or_create(
            username="tecnico1",
            defaults={
                "email": "tecnico1@sira-ti.local",
                "first_name": "Carlos",
                "last_name": "Ramírez",
                "role": role_tech,
            },
        )
        if created:
            tech_user.set_password("Tecnico123*")
            tech_user.save()

        client_user, created = User.objects.get_or_create(
            username="cliente1",
            defaults={
                "email": "cliente1@sira-ti.local",
                "first_name": "Laura",
                "last_name": "Gómez",
                "role": role_client,
            },
        )
        if created:
            client_user.set_password("Cliente123*")
            client_user.save()

        # --- Catálogos de tickets --------------------------------------
        categories = {}
        for name in ["Hardware", "Software", "Redes", "Cuentas de usuario", "Aplicaciones"]:
            categories[name], _ = Category.objects.get_or_create(name=name)

        priorities = {}
        for name, level, color in [
            (Priority.LOW, 1, "#77ACA2"),
            (Priority.MEDIUM, 2, "#468189"),
            (Priority.HIGH, 3, "#F4A259"),
            (Priority.CRITICAL, 4, "#D64545"),
        ]:
            priorities[name], _ = Priority.objects.get_or_create(
                name=name, defaults={"level": level, "color": color}
            )

        statuses = {}
        for name, order, is_closed in [
            (Status.NEW, 1, False),
            (Status.ASSIGNED, 2, False),
            (Status.IN_PROGRESS, 3, False),
            (Status.ON_HOLD, 4, False),
            (Status.RESOLVED, 5, True),
            (Status.CLOSED, 6, True),
        ]:
            statuses[name], _ = Status.objects.get_or_create(
                name=name, defaults={"order": order, "is_closed": is_closed}
            )

        # --- SLA por prioridad ------------------------------------------
        sla_defs = [
            (Priority.LOW, 480, 2880),      # 8h respuesta / 48h solución
            (Priority.MEDIUM, 240, 1440),   # 4h respuesta / 24h solución
            (Priority.HIGH, 60, 480),       # 1h respuesta / 8h solución
            (Priority.CRITICAL, 15, 240),   # 15min respuesta / 4h solución
        ]
        slas = {}
        for priority_name, resp, resol in sla_defs:
            slas[priority_name], _ = SLA.objects.get_or_create(
                priority=priorities[priority_name],
                defaults={
                    "name": f"SLA {priorities[priority_name].get_name_display()}",
                    "description": "SLA estándar generado en datos iniciales",
                    "max_response_time": resp,
                    "max_resolution_time": resol,
                },
            )

        # --- Técnico y cliente -------------------------------------------
        technician, _ = Technician.objects.get_or_create(
            document="1000111222",
            defaults={
                "user": tech_user,
                "name": "Carlos Ramírez",
                "email": "tecnico1@sira-ti.local",
                "phone": "3001234567",
                "specialty": "Soporte de hardware y redes",
                "hire_date": date(2023, 3, 1),
            },
        )

        client, _ = Client.objects.get_or_create(
            document="900123456",
            defaults={
                "user": client_user,
                "name": "Laura Gómez",
                "company": "Comercial Andina S.A.S.",
                "email": "cliente1@sira-ti.local",
                "phone": "3109876543",
                "address": "Calle 10 # 20-30, Bogotá",
            },
        )

        # --- Servicio de ejemplo -----------------------------------------
        service, _ = Service.objects.get_or_create(
            name="Soporte de hardware",
            defaults={
                "description": "Diagnóstico y reparación de equipos de cómputo",
                "category": categories["Hardware"],
                "responsible": technician,
                "sla": slas[Priority.MEDIUM],
            },
        )

        # --- Ticket de ejemplo -------------------------------------------
        ticket, created = Ticket.objects.get_or_create(
            subject="El computador no enciende",
            client=client,
            defaults={
                "created_by": client_user,
                "technician": technician,
                "category": categories["Hardware"],
                "priority": priorities[Priority.MEDIUM],
                "service": service,
                "status": statuses[Status.ASSIGNED],
                "sla": slas[Priority.MEDIUM],
                "description": "El equipo de escritorio de la recepción no enciende desde esta mañana.",
            },
        )
        if created:
            Comment.objects.create(
                ticket=ticket,
                author=tech_user,
                content="Se revisará la fuente de poder del equipo esta tarde.",
                is_internal=False,
            )

        self.stdout.write(self.style.SUCCESS("Datos iniciales creados correctamente."))
        self.stdout.write("Usuarios de prueba:")
        self.stdout.write("  admin     / Admin123*    (Administrador)")
        self.stdout.write("  tecnico1  / Tecnico123*  (Técnico)")
        self.stdout.write("  cliente1  / Cliente123*  (Cliente)")
