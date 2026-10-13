"""
Pruebas de las imágenes adjuntas a tickets: validación del contenido real,
límites configurables, control de acceso por rol y limpieza de archivos.
"""
import os
import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.technicians.models import Technician
from apps.tickets.models import Priority, Status, Ticket, TicketAttachment
from apps.users.models import Role

User = get_user_model()


def make_image(name="foto.png", image_format="PNG", size=(20, 20), color="red"):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, image_format)
    return SimpleUploadedFile(name, buffer.getvalue())


class TicketAttachmentTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Los archivos subidos en las pruebas van a un directorio temporal.
        cls._media_dir = tempfile.mkdtemp()
        cls._media_override = override_settings(MEDIA_ROOT=cls._media_dir)
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._media_dir, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        role_admin = Role.objects.create(name=Role.ADMIN)
        role_tech = Role.objects.create(name=Role.TECHNICIAN)
        role_client = Role.objects.create(name=Role.CLIENT)

        User.objects.create_user(username="admin", password="Admin123*", role=role_admin)
        self.tech_user = User.objects.create_user(username="tech", password="Tech123*", role=role_tech)
        self.other_tech_user = User.objects.create_user(username="tech2", password="Tech123*", role=role_tech)
        self.client_user = User.objects.create_user(username="cli", password="Cli123*", role=role_client)
        self.other_client_user = User.objects.create_user(username="cli2", password="Cli123*", role=role_client)

        self.technician = Technician.objects.create(user=self.tech_user, name="Téc 1", document="111", email="t@t.com")
        Technician.objects.create(user=self.other_tech_user, name="Téc 2", document="112", email="t2@t.com")
        self.client_obj = Client.objects.create(user=self.client_user, name="Cli 1", document="222", email="c@c.com")
        Client.objects.create(user=self.other_client_user, name="Cli 2", document="223", email="c2@c.com")

        priority = Priority.objects.create(name=Priority.MEDIUM, level=2)
        self.status_new = Status.objects.create(name=Status.NEW, order=1, is_closed=False)
        self.status_closed = Status.objects.create(name=Status.CLOSED, order=6, is_closed=True)

        self.ticket = Ticket.objects.create(
            client=self.client_obj, priority=priority, status=self.status_new,
            technician=self.technician, subject="Pantalla rota", description="Detalle",
        )
        self.url = f"/api/tickets/{self.ticket.id}/attachments/"

    def _login(self, username, password):
        response = self.client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def _upload(self, *files, url=None):
        return self.client.post(url or self.url, {"images": list(files)}, format="multipart")

    # --- Subida válida -------------------------------------------------------

    def test_client_can_upload_several_images_to_own_ticket(self):
        self._login("cli", "Cli123*")
        response = self._upload(make_image("a.png"), make_image("b.jpg", "JPEG"), make_image("c.webp", "WEBP"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(self.ticket.attachments.count(), 3)
        self.assertEqual({a["content_type"] for a in response.data}, {"image/png", "image/jpeg", "image/webp"})
        self.assertEqual(response.data[0]["uploaded_by"], self.client_user.id)

    def test_files_are_stored_under_uuid_names_with_extension_from_real_format(self):
        """Un PNG real llamado 'evil.php' se guarda como .png y conserva el nombre original solo como dato."""
        self._login("cli", "Cli123*")
        response = self._upload(make_image("evil.php", "PNG"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        attachment = TicketAttachment.objects.get()
        self.assertEqual(attachment.original_name, "evil.php")
        self.assertTrue(attachment.image.name.startswith(f"tickets/{self.ticket.id}/"))
        self.assertTrue(attachment.image.name.endswith(".png"))
        self.assertNotIn("evil", attachment.image.name)
        self.assertTrue(os.path.exists(attachment.image.path))

    def test_ticket_detail_lists_attachments_without_exposing_file_paths(self):
        self._login("cli", "Cli123*")
        self._upload(make_image())
        detail = self.client.get(f"/api/tickets/{self.ticket.id}/")
        self.assertEqual(len(detail.data["attachments"]), 1)
        self.assertEqual(
            set(detail.data["attachments"][0]),
            {"id", "original_name", "content_type", "size", "uploaded_by", "uploaded_by_name", "uploaded_at"},
        )

    # --- Validaciones ----------------------------------------------------------

    def test_rejects_text_file_renamed_as_image(self):
        self._login("cli", "Cli123*")
        fake = SimpleUploadedFile("falsa.png", b"esto no es una imagen", content_type="image/png")
        response = self._upload(fake)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no es una imagen válida", response.data["images"][0])
        self.assertEqual(TicketAttachment.objects.count(), 0)

    def test_rejects_disallowed_image_format(self):
        self._login("cli", "Cli123*")
        response = self._upload(make_image("anim.gif", "GIF"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("formato no permitido", response.data["images"][0])

    def test_rejects_file_over_size_limit(self):
        self._login("cli", "Cli123*")
        # Ruido aleatorio: un PNG de ~1,1 MB que no se puede comprimir.
        noise = Image.frombytes("RGB", (600, 600), os.urandom(600 * 600 * 3))
        buffer = BytesIO()
        noise.save(buffer, "PNG")
        big = SimpleUploadedFile("grande.png", buffer.getvalue())
        self.assertGreater(big.size, 1024 * 1024)
        with override_settings(TICKET_ATTACHMENT_MAX_SIZE_MB=1):
            response = self._upload(big)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("supera el tamaño máximo de 1 MB", response.data["images"][0])

    def test_rejects_empty_file(self):
        self._login("cli", "Cli123*")
        response = self._upload(SimpleUploadedFile("vacia.png", b""))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_when_no_images_are_sent(self):
        self._login("cli", "Cli123*")
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enforces_max_files_per_ticket_including_existing_ones(self):
        self._login("cli", "Cli123*")
        with override_settings(TICKET_ATTACHMENT_MAX_FILES=2):
            self.assertEqual(self._upload(make_image("1.png")).status_code, status.HTTP_201_CREATED)
            over = self._upload(make_image("2.png"), make_image("3.png"))
            self.assertEqual(over.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("máximo 2 imágenes", over.data["images"][0])
        self.assertEqual(self.ticket.attachments.count(), 1)

    def test_upload_is_all_or_nothing_and_reports_every_problem(self):
        self._login("cli", "Cli123*")
        response = self._upload(
            make_image("buena.png"),
            SimpleUploadedFile("mala1.png", b"nada"),
            make_image("mala2.gif", "GIF"),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(response.data["images"]), 2)
        self.assertEqual(TicketAttachment.objects.count(), 0)

    def test_cannot_add_images_to_closed_ticket(self):
        self.ticket.status = self.status_closed
        self.ticket.save()
        self._login("cli", "Cli123*")
        response = self._upload(make_image())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cerrado", response.data["images"][0])

    # --- Control de acceso -----------------------------------------------------

    def test_other_client_cannot_list_or_upload_to_foreign_ticket(self):
        self._login("cli", "Cli123*")
        self._upload(make_image())
        self._login("cli2", "Cli123*")
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self._upload(make_image()).status_code, status.HTTP_404_NOT_FOUND)

    def test_unassigned_technician_has_no_access(self):
        self._login("tech2", "Tech123*")
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_assigned_technician_and_admin_can_view_images(self):
        self._login("cli", "Cli123*")
        self._upload(make_image())
        for username, password in [("tech", "Tech123*"), ("admin", "Admin123*")]:
            self._login(username, password)
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 1)

    # --- Descarga del archivo ----------------------------------------------------

    def test_file_download_returns_original_bytes_with_safe_headers(self):
        self._login("cli", "Cli123*")
        original = make_image("evidencia.png", color="blue")
        content = original.read()
        original.seek(0)
        attachment_id = self._upload(original).data[0]["id"]

        self._login("tech", "Tech123*")
        response = self.client.get(f"{self.url}{attachment_id}/file/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(response.streaming_content), content)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("evidencia.png", response["Content-Disposition"])

    def test_file_download_requires_authentication(self):
        self._login("cli", "Cli123*")
        attachment_id = self._upload(make_image()).data[0]["id"]
        self.client.credentials()  # sin token
        response = self.client.get(f"{self.url}{attachment_id}/file/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_other_client_cannot_download_foreign_file_even_knowing_the_id(self):
        self._login("cli", "Cli123*")
        attachment_id = self._upload(make_image()).data[0]["id"]
        self._login("cli2", "Cli123*")
        response = self.client.get(f"{self.url}{attachment_id}/file/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_file_download_of_unknown_attachment_is_404(self):
        self._login("cli", "Cli123*")
        self.assertEqual(self.client.get(f"{self.url}9999/file/").status_code, status.HTTP_404_NOT_FOUND)

    def test_attachment_id_from_another_ticket_is_not_reachable_through_this_one(self):
        other_ticket = Ticket.objects.create(
            client=self.client_obj, priority=self.ticket.priority, status=self.status_new,
            subject="Otro", description="Detalle",
        )
        self._login("cli", "Cli123*")
        foreign_id = self._upload(make_image(), url=f"/api/tickets/{other_ticket.id}/attachments/").data[0]["id"]
        response = self.client.get(f"{self.url}{foreign_id}/file/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Limpieza ------------------------------------------------------------------

    def test_deleting_a_ticket_removes_its_files_from_disk(self):
        self._login("cli", "Cli123*")
        self._upload(make_image(), make_image("b.jpg", "JPEG"))
        paths = [a.image.path for a in TicketAttachment.objects.all()]
        self.assertTrue(all(os.path.exists(p) for p in paths))

        with self.captureOnCommitCallbacks(execute=True):
            self.ticket.delete()

        self.assertEqual(TicketAttachment.objects.count(), 0)
        self.assertFalse(any(os.path.exists(p) for p in paths))
