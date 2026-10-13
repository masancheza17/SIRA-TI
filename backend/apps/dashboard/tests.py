"""Pruebas del endpoint de KPIs del dashboard."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.tickets.models import Priority, Status, Ticket
from apps.users.models import Role

User = get_user_model()


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        role_admin = Role.objects.create(name=Role.ADMIN)
        self.admin_user = User.objects.create_user(username="admin", password="Admin123*", role=role_admin)
        client_obj = Client.objects.create(name="Cliente Demo", document="333", email="d@d.com")
        priority = Priority.objects.create(name=Priority.MEDIUM, level=2)
        new_status = Status.objects.create(name=Status.NEW, order=1, is_closed=False)
        Ticket.objects.create(
            client=client_obj, priority=priority, status=new_status,
            subject="Ticket demo", description="Detalle",
        )

        response = self.client.post("/api/auth/login/", {"username": "admin", "password": "Admin123*"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_dashboard_summary_returns_real_counts(self):
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kpis"]["total_tickets"], 1)
        self.assertIn("tickets_by_status", response.data["charts"])

    def test_dashboard_breaks_down_tickets_by_type(self):
        """El ticket de setUp nace como solicitud; se agrega un incidente."""
        ticket = Ticket.objects.first()
        Ticket.objects.create(
            client=ticket.client, priority=ticket.priority, status=ticket.status,
            subject="Sistema caído", description="Detalle", ticket_type=Ticket.TYPE_INCIDENT,
        )
        response = self.client.get("/api/dashboard/summary/")
        by_type = {row["ticket_type"]: row["total"] for row in response.data["charts"]["tickets_by_type"]}
        self.assertEqual(by_type, {Ticket.TYPE_INCIDENT: 1, Ticket.TYPE_REQUEST: 1})
