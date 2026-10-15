"""
Rutas de autenticación de SIRA TI.

Expone login (obtención de tokens JWT con rol incluido), logout (invalida el
refresh token) y el flujo de
recuperación de contraseña en dos pasos. El refresh de tokens se
registra directamente en config/urls.py usando la vista estándar de
SimpleJWT.
"""
from django.urls import path

from .views import (
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RoleAwareTokenObtainPairView,
)

urlpatterns = [
    path("login/", RoleAwareTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
]