"""Pruebas de autenticación y permisos por rol."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import Role

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(name=Role.ADMIN)
        self.admin = User.objects.create_user(
            username="admin", password="Admin123*", role=self.role_admin
        )

    def test_login_returns_role_and_tokens(self):
        response = self.client.post(
            "/api/auth/login/", {"username": "admin", "password": "Admin123*"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["role"], Role.ADMIN)

    def test_login_with_wrong_password_fails(self):
        response = self.client.post(
            "/api/auth/login/", {"username": "admin", "password": "wrong"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_endpoint_requires_authentication(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
