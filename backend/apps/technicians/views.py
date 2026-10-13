"""Vistas del módulo de Técnicos."""
from rest_framework import viewsets

from apps.users.permissions import IsAdmin, IsAdminOrTechnician

from .models import Technician
from .serializers import TechnicianSerializer


class TechnicianViewSet(viewsets.ModelViewSet):
    """
    CRUD de técnicos.

    Solo el Administrador puede crear, editar o desactivar técnicos.
    Los propios técnicos (y el administrador) pueden listar/consultar
    técnicos, por ejemplo para reasignar un ticket a un compañero.
    """

    queryset = Technician.objects.all().order_by("name")
    serializer_class = TechnicianSerializer
    filterset_fields = ["status", "specialty"]
    search_fields = ["name", "document", "email", "specialty"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAdminOrTechnician()]
        return [IsAdmin()]
