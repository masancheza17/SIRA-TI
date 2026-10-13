"""Rutas del módulo de Técnicos."""
from rest_framework.routers import DefaultRouter

from .views import TechnicianViewSet

router = DefaultRouter()
router.register("", TechnicianViewSet, basename="technician")

urlpatterns = router.urls
