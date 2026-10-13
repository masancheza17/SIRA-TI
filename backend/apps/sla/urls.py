"""Rutas del módulo de SLA."""
from rest_framework.routers import DefaultRouter

from .views import SLAViewSet

router = DefaultRouter()
router.register("", SLAViewSet, basename="sla")

urlpatterns = router.urls
