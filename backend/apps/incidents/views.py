"""Vistas del módulo de Incidentes."""
from rest_framework import viewsets

from apps.users.models import Role

from .models import Incident
from .serializers import IncidentCreateSerializer, IncidentSerializer


class IncidentViewSet(viewsets.ModelViewSet):
    """
    CRUD de Incidentes.

    Reutiliza el mismo control de visibilidad por rol que los
    tickets: un cliente solo ve los incidentes de sus propios
    tickets, un técnico solo los que tiene asignados.
    """

    queryset = Incident.objects.select_related("ticket").all()

    def get_serializer_class(self):
        if self.action == "create":
            return IncidentCreateSerializer
        return IncidentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        role = user.role_name
        if role == Role.ADMIN:
            return qs
        if role == Role.TECHNICIAN:
            return qs.filter(ticket__technician__user=user)
        if role == Role.CLIENT:
            return qs.filter(ticket__client__user=user)
        return qs.none()
