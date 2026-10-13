"""Vistas del módulo de Catálogo de Servicios."""
from rest_framework import viewsets

from apps.users.permissions import IsAdminOrReadOnly

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD del catálogo de servicios ITIL. Lectura para todo usuario
    autenticado (los clientes necesitan verlo al crear un ticket),
    escritura restringida al Administrador.
    """

    queryset = Service.objects.select_related("category", "responsible", "sla").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["status", "category"]
    search_fields = ["name", "description"]
