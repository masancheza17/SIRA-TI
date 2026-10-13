"""Vistas del módulo de SLA."""
from rest_framework import viewsets

from apps.users.permissions import IsAdminOrReadOnly

from .models import SLA
from .serializers import SLASerializer


class SLAViewSet(viewsets.ModelViewSet):
    """
    CRUD de SLA. Cualquier usuario autenticado puede consultarlos
    (los técnicos y clientes necesitan ver los tiempos comprometidos),
    pero solo el Administrador puede crearlos o modificarlos.
    """

    queryset = SLA.objects.select_related("priority").all()
    serializer_class = SLASerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["status", "priority"]
