"""
Pruebas del ciclo de vida de tickets: creación, asignación, cambio de
estado, cálculo de tiempos de SLA y control de acceso por rol.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.services.models import Service
from apps.sla.models import SLA
from apps.technicians.models import Technician
from apps.tickets.models import Priority, Status
from apps.users.models import Role

User = get_user_model()


class TicketLifecycleTests(APITestCase):
    def setUp(self):
        role_admin = Role.objects.create(name=Role.ADMIN)
        role_tech = Role.objects.create(name=Role.TECHNICIAN)
        role_client = Role.objects.create(name=Role.CLIENT)

        self.admin_user = User.objects.create_user(username="admin", password="Admin123*", role=role_admin)
        self.tech_user = User.objects.create_user(username="tech", password="Tech123*", role=role_tech)
        self.client_user = User.objects.create_user(username="cli", password="Cli123*", role=role_client)

        self.technician = Technician.objects.create(
            user=self.tech_user, name="Técnico Uno", document="111", email="t@t.com"
        )
        self.client_obj = Client.objects.create(
            user=self.client_user, name="Cliente Uno", document="222", email="c@c.com"
        )

        for name, level in [(Priority.LOW, 1), (Priority.MEDIUM, 2), (Priority.HIGH, 3), (Priority.CRITICAL, 4)]:
            Priority.objects.create(name=name, level=level)

        for name, order, is_closed in [
            (Status.NEW, 1, False), (Status.ASSIGNED, 2, False), (Status.IN_PROGRESS, 3, False),
            (Status.ON_HOLD, 4, False), (Status.RESOLVED, 5, True), (Status.CLOSED, 6, True),
        ]:
            Status.objects.create(name=name, order=order, is_closed=is_closed)

        SLA.objects.create(
            name="SLA Media", priority=Priority.objects.get(name=Priority.MEDIUM),
            max_response_time=240, max_resolution_time=1440,
        )

    def _login(self, username, password):
        response = self.client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_client_can_create_ticket_for_self_only(self):
        self._login("cli", "Cli123*")
        response = self.client.post(
            "/api/tickets/",
            {
                "client": self.client_obj.id,
                "priority": Priority.MEDIUM,
                "subject": "No enciende el PC",
                "description": "Detalle del problema",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["client"], self.client_obj.id)

    def test_assign_technician_sets_status_and_response_time(self):
        self._login("admin", "Admin123*")
        create_resp = self.client.post(
            "/api/tickets/",
            {
                "client": self.client_obj.id, "priority": Priority.MEDIUM,
                "subject": "Ticket de prueba", "description": "Detalle",
            },
            format="json",
        )
        ticket_id = create_resp.data["id"]

        assign_resp = self.client.post(
            f"/api/tickets/{ticket_id}/assign/", {"technician": self.technician.id}, format="json"
        )
        self.assertEqual(assign_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(assign_resp.data["status_name"], "Asignado")
        self.assertIsNotNone(assign_resp.data["response_time_minutes"])

    def test_technician_only_sees_assigned_tickets(self):
        self._login("admin", "Admin123*")
        create_resp = self.client.post(
            "/api/tickets/",
            {
                "client": self.client_obj.id, "priority": Priority.MEDIUM,
                "subject": "Ticket sin asignar", "description": "Detalle",
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)

        self._login("tech", "Tech123*")
        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)  # aún no le han asignado nada

    def test_client_cannot_access_technicians_endpoint(self):
        self._login("cli", "Cli123*")
        response = self.client.get("/api/technicians/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resolve_ticket_calculates_resolution_time(self):
        self._login("admin", "Admin123*")
        create_resp = self.client.post(
            "/api/tickets/",
            {
                "client": self.client_obj.id, "priority": Priority.MEDIUM,
                "subject": "Ticket a resolver", "description": "Detalle",
            },
            format="json",
        )
        ticket_id = create_resp.data["id"]
        self.client.post(f"/api/tickets/{ticket_id}/assign/", {"technician": self.technician.id}, format="json")

        resolve_resp = self.client.post(
            f"/api/tickets/{ticket_id}/change_status/", {"status": Status.RESOLVED}, format="json"
        )
        self.assertEqual(resolve_resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resolve_resp.data["resolution_time_minutes"])
        self.assertIn(resolve_resp.data["sla_compliance"]["state"], ["cumplido", "incumplido"])

    # --- Clasificación Incidente / Solicitud --------------------------------

    def _create_ticket(self, **extra):
        """Crea un ticket como admin y devuelve su id (clasificación por defecto: solicitud)."""
        self._login("admin", "Admin123*")
        payload = {
            "client": self.client_obj.id, "priority": Priority.MEDIUM,
            "subject": "Ticket de clasificación", "description": "Detalle",
        }
        payload.update(extra)
        response = self.client.post("/api/tickets/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data["id"]

    def test_ticket_exposes_type_label(self):
        ticket_id = self._create_ticket(ticket_type="incident")
        response = self.client.get(f"/api/tickets/{ticket_id}/")
        self.assertEqual(response.data["ticket_type"], "incident")
        self.assertEqual(response.data["ticket_type_name"], "Incidente")

    def test_admin_can_change_type_and_it_is_logged_in_history(self):
        ticket_id = self._create_ticket()  # nace como solicitud
        response = self.client.post(
            f"/api/tickets/{ticket_id}/change_type/", {"ticket_type": "incident"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["ticket_type"], "incident")

        entry = [h for h in response.data["history"] if h["field_changed"] == "ticket_type"]
        self.assertEqual(len(entry), 1)
        self.assertEqual(entry[0]["new_value"], "Incidente")

    def test_technician_can_change_type(self):
        ticket_id = self._create_ticket()
        self.client.post(f"/api/tickets/{ticket_id}/assign/", {"technician": self.technician.id}, format="json")

        self._login("tech", "Tech123*")
        response = self.client.post(
            f"/api/tickets/{ticket_id}/change_type/", {"ticket_type": "incident"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_client_cannot_change_type(self):
        ticket_id = self._create_ticket()
        self._login("cli", "Cli123*")
        response = self.client.post(
            f"/api/tickets/{ticket_id}/change_type/", {"ticket_type": "incident"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_change_type_rejects_invalid_value(self):
        ticket_id = self._create_ticket()
        response = self.client.post(
            f"/api/tickets/{ticket_id}/change_type/", {"ticket_type": "otro"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_type_to_same_value_does_not_log_history(self):
        ticket_id = self._create_ticket()
        response = self.client.post(
            f"/api/tickets/{ticket_id}/change_type/", {"ticket_type": "request"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse([h for h in response.data["history"] if h["field_changed"] == "ticket_type"])

    def test_direct_patch_cannot_change_type(self):
        """El tipo solo cambia por change_type (con permisos e historial), no por PATCH directo."""
        ticket_id = self._create_ticket()
        self.client.patch(f"/api/tickets/{ticket_id}/", {"ticket_type": "incident"}, format="json")
        detail = self.client.get(f"/api/tickets/{ticket_id}/")
        self.assertEqual(detail.data["ticket_type"], "request")

    def test_list_can_be_filtered_by_type(self):
        self._create_ticket(ticket_type="incident")
        self._create_ticket(ticket_type="request")
        response = self.client.get("/api/tickets/?ticket_type=incident")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["ticket_type_name"], "Incidente")

    # --- Creación de tickets por el rol Cliente (regresión) -------------------

    def test_client_can_create_ticket_without_sending_client_field(self):
        """El frontend no envía `client` cuando quien crea es un Cliente."""
        self._login("cli", "Cli123*")
        response = self.client.post(
            "/api/tickets/",
            {"priority": Priority.MEDIUM, "subject": "Sin campo client", "description": "Detalle"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["client"], self.client_obj.id)

    def test_client_cannot_create_ticket_for_another_client(self):
        other = Client.objects.create(name="Otro", document="999", email="o@o.com")
        self._login("cli", "Cli123*")
        response = self.client.post(
            "/api/tickets/",
            {"client": other.id, "priority": Priority.MEDIUM, "subject": "Ajeno", "description": "Detalle"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["client"], self.client_obj.id)  # se ignora el enviado

    def test_admin_must_specify_client_when_creating_ticket(self):
        self._login("admin", "Admin123*")
        response = self.client.post(
            "/api/tickets/",
            {"priority": Priority.MEDIUM, "subject": "Sin cliente", "description": "Detalle"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("client", response.data)
