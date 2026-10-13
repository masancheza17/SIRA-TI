"""
Permisos por rol de SIRA TI.

Estas clases se combinan con `IsAuthenticated` (permiso por defecto
en REST_FRAMEWORK, ver config/settings.py) para restringir el acceso
a nivel de vista según el rol del usuario autenticado. La
autorización SIEMPRE se valida en el backend; el frontend solo oculta
opciones de UI por comodidad, nunca es la única barrera de seguridad.
"""
from rest_framework.permissions import BasePermission

from .models import Role


class IsAdmin(BasePermission):
    """Permite el acceso únicamente a usuarios con rol Administrador."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role_name == Role.ADMIN)


class IsTechnician(BasePermission):
    """Permite el acceso únicamente a usuarios con rol Técnico."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role_name == Role.TECHNICIAN)


class IsClient(BasePermission):
    """Permite el acceso únicamente a usuarios con rol Cliente."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role_name == Role.CLIENT)


class IsAdminOrTechnician(BasePermission):
    """Permite el acceso a Administradores y Técnicos (personal interno)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role_name in (Role.ADMIN, Role.TECHNICIAN)
        )


class IsAdminOrReadOnly(BasePermission):
    """Cualquier usuario autenticado puede leer; solo el Administrador puede escribir."""

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in self.SAFE_METHODS:
            return True
        return user.role_name == Role.ADMIN
