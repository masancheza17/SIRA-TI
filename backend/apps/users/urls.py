"""Rutas del módulo de Usuarios (CRUD administrativo + perfil propio)."""
from rest_framework.routers import DefaultRouter

from .views import UserViewSet

router = DefaultRouter()
router.register("", UserViewSet, basename="user")

urlpatterns = router.urls
