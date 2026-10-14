"""Pruebas de seguridad de autenticación: logout, blacklist de tokens, límite de intentos y seed."""
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from apps.users.models import Role

User = get_user_model()


class TokenBlacklistTests(APITestCase):
    def setUp(self):
        cache.clear()
        role_admin = Role.objects.create(name=Role.ADMIN)
        User.objects.create_user(username="admin", password="Admin123*", role=role_admin)

    def _login(self):
        return self.client.post("/api/auth/login/", {"username": "admin", "password": "Admin123*"}, format="json").data

    def test_logout_invalidates_refresh_token(self):
        tokens = self._login()
        logout = self.client.post("/api/auth/logout/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        refresh = self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_with_invalid_token_returns_400(self):
        response = self.client.post("/api/auth/logout/", {"refresh": "no-es-un-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_requires_refresh_field(self):
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rotated_refresh_token_cannot_be_reused(self):
        """Al refrescar se emite un refresh nuevo y el anterior queda invalidado."""
        tokens = self._login()
        first = self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", first.data)  # el frontend debe guardar este nuevo refresh

        reuse = self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)


class ThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        role_admin = Role.objects.create(name=Role.ADMIN)
        User.objects.create_user(username="admin", password="Admin123*", role=role_admin)

    def tearDown(self):
        cache.clear()

    def test_login_is_rate_limited(self):
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"login": "3/min"}):
            codes = [
                self.client.post("/api/auth/login/", {"username": "admin", "password": "mala"}, format="json").status_code
                for _ in range(5)
            ]
        self.assertEqual(codes[:3], [status.HTTP_401_UNAUTHORIZED] * 3)
        self.assertEqual(codes[3:], [status.HTTP_429_TOO_MANY_REQUESTS] * 2)

    def test_password_reset_is_rate_limited(self):
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"password_reset": "2/hour"}):
            codes = [
                self.client.post("/api/auth/password-reset/", {"email": "a@a.com"}, format="json").status_code
                for _ in range(3)
            ]
        self.assertEqual(codes, [status.HTTP_200_OK, status.HTTP_200_OK, status.HTTP_429_TOO_MANY_REQUESTS])


class SeedPasswordsTests(APITestCase):
    def test_seed_uses_random_passwords_outside_debug(self):
        out = StringIO()
        with override_settings(DEBUG=False), mock.patch.dict("os.environ", {}, clear=False):
            for var in ("SEED_ADMIN_PASSWORD", "SEED_TECH_PASSWORD", "SEED_CLIENT_PASSWORD"):
                mock.patch.dict("os.environ").start().pop(var, None)
            call_command("seed_data", stdout=out)
        mock.patch.stopall()

        self.assertIn("Contraseñas generadas", out.getvalue())
        response = self.client.post("/api/auth/login/", {"username": "admin", "password": "Admin123*"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seed_uses_demo_passwords_in_debug(self):
        with override_settings(DEBUG=True):
            call_command("seed_data", stdout=StringIO())
        response = self.client.post("/api/auth/login/", {"username": "admin", "password": "Admin123*"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
