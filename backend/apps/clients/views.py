"""Vistas del módulo de Clientes."""
from rest_framework import viewsets

from apps.users.permissions import IsAdminOrTechnician

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    CRUD de clientes.

    Administradores y Técnicos pueden gestionar clientes (los
    técnicos suelen necesitar consultarlos/actualizarlos al atender
    tickets). Los Clientes no acceden a este endpoint: consultan sus
    propios datos a través de su perfil de usuario.
    """

    queryset = Client.objects.all().order_by("-created_at")
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrTechnician]
    filterset_fields = ["status"]
    search_fields = ["name", "company", "document", "email"]
