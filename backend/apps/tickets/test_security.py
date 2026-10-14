"""
Pruebas de seguridad del módulo de tickets: qué NO puede hacer cada rol.

Complementan a tests.py (que prueba el flujo normal). Aquí se comprueba que el
backend impide acciones que antes estaban abiertas a cualquier usuario autenticado.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.technicians.models import Technician
from apps.tickets.models import Category, Comment, Priority, Status, Ticket
from apps.users.models import Role

User = get_user_model()


class TicketSecurityTests(APITestCase):
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

        self.priority = Priority.objects.create(name=Priority.MEDIUM, level=2)
        self.status_new = Status.objects.create(name=Status.NEW, order=1, is_closed=False)
        self.status_resolved = Status.objects.create(name=Status.RESOLVED, order=5, is_closed=True)
        self.status_closed = Status.objects.create(name=Status.CLOSED, order=6, is_closed=True)

        # Ticket del cliente, asignado al técnico, con un comentario público y uno interno.
        self.ticket = Ticket.objects.create(
            client=self.client_obj, technician=self.technician, priority=self.priority,
            status=self.status_new, subject="Ticket", description="Detalle",
            created_by=self.client_user,
        )
        Comment.objects.create(ticket=self.ticket, author=self.tech_user, content="Público", is_internal=False)
        Comment.objects.create(ticket=self.ticket, author=self.tech_user, content="SECRETO interno", is_internal=True)

    def _login(self, username, password):
        response = self.client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    # --- Edición / borrado directo de tickets --------------------------------

    def test_client_cannot_patch_own_ticket(self):
        """Antes un cliente podía cambiar estado, prioridad o técnico con un PATCH."""
        self._login("cli", "Cli123*")
        response = self.client.patch(
            f"/api/tickets/{self.ticket.id}/", {"status": self.status_closed.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, self.status_new)

    def test_client_cannot_delete_own_ticket(self):
        self._login("cli", "Cli123*")
        response = self.client.delete(f"/api/tickets/{self.ticket.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Ticket.objects.filter(pk=self.ticket.pk).exists())

    def test_technician_cannot_patch_or_delete_ticket_directly(self):
        self._login("tech", "Tech123*")
        patch = self.client.patch(f"/api/tickets/{self.ticket.id}/", {"subject": "x"}, format="json")
        delete = self.client.delete(f"/api/tickets/{self.ticket.id}/")
        self.assertEqual(patch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_patch_ticket(self):
        self._login("admin", "Admin123*")
        response = self.client.patch(f"/api/tickets/{self.ticket.id}/", {"subject": "Editado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Cambio de estado / cierre ---------------------------------------------

    def test_client_cannot_change_status_or_close(self):
        self._login("cli", "Cli123*")
        change = self.client.post(
            f"/api/tickets/{self.ticket.id}/change_status/", {"status": Status.RESOLVED}, format="json"
        )
        close = self.client.post(f"/api/tickets/{self.ticket.id}/close/", {"solution": "ya"}, format="json")
        self.assertEqual(change.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(close.status_code, status.HTTP_403_FORBIDDEN)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, self.status_new)

    def test_technician_can_change_status_of_assigned_ticket(self):
        self._login("tech", "Tech123*")
        response = self.client.post(
            f"/api/tickets/{self.ticket.id}/change_status/", {"status": Status.RESOLVED}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Comentarios internos ---------------------------------------------------

    def test_client_does_not_see_internal_comments_in_ticket_detail(self):
        self._login("cli", "Cli123*")
        response = self.client.get(f"/api/tickets/{self.ticket.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contents = [c["content"] for c in response.data["comments"]]
        self.assertEqual(contents, ["Público"])

    def test_client_does_not_see_internal_comments_in_comments_endpoint(self):
        self._login("cli", "Cli123*")
        response = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")
        self.assertEqual([c["content"] for c in response.data], ["Público"])

    def test_staff_sees_internal_comments(self):
        for username, password in [("tech", "Tech123*"), ("admin", "Admin123*")]:
            self._login(username, password)
            detail = self.client.get(f"/api/tickets/{self.ticket.id}/")
            listing = self.client.get(f"/api/tickets/{self.ticket.id}/comments/")
            self.assertEqual(len(detail.data["comments"]), 2, username)
            self.assertEqual(len(listing.data), 2, username)

    def test_client_cannot_create_internal_comment(self):
        self._login("cli", "Cli123*")
        response = self.client.post(
            f"/api/tickets/{self.ticket.id}/comments/", {"content": "hola", "is_internal": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_internal"])

    def test_empty_comment_is_rejected(self):
        self._login("cli", "Cli123*")
        response = self.client.post(f"/api/tickets/{self.ticket.id}/comments/", {"content": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Catálogos --------------------------------------------------------------

    def test_client_can_read_but_not_modify_catalogs(self):
        self._login("cli", "Cli123*")
        for url in ("categories", "priorities", "statuses"):
            self.assertEqual(self.client.get(f"/api/tickets/{url}/").status_code, status.HTTP_200_OK, url)

        create = self.client.post("/api/tickets/categories/", {"name": "Hackeada"}, format="json")
        self.assertEqual(create.status_code, status.HTTP_403_FORBIDDEN)
        delete = self.client.delete(f"/api/tickets/priorities/{self.priority.id}/")
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Category.objects.filter(name="Hackeada").exists())

    def test_admin_can_modify_catalogs(self):
        self._login("admin", "Admin123*")
        response = self.client.post("/api/tickets/categories/", {"name": "Red"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
