"""Rutas del módulo de Tickets (incluye catálogos de categoría/prioridad/estado)."""
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, PriorityViewSet, StatusViewSet, TicketViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("priorities", PriorityViewSet, basename="priority")
router.register("statuses", StatusViewSet, basename="status")
router.register("", TicketViewSet, basename="ticket")

urlpatterns = router.urls
