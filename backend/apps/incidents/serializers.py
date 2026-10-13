"""Serializers del módulo de Incidentes."""
from rest_framework import serializers

from apps.tickets.models import Priority, Status, Ticket, TicketHistory
from apps.tickets.serializers import TicketDetailSerializer

from .models import Incident


class IncidentSerializer(serializers.ModelSerializer):
    ticket_detail = TicketDetailSerializer(source="ticket", read_only=True)

    class Meta:
        model = Incident
        fields = ["id", "ticket", "ticket_detail", "impact", "urgency", "root_cause", "is_major_incident"]
        read_only_fields = ["ticket"]


class IncidentCreateSerializer(serializers.Serializer):
    """
    Crea en una sola llamada el Ticket (con ticket_type="incident") y
    su registro de Incident asociado, para simplificar el flujo desde
    el frontend.
    """

    client = serializers.IntegerField()
    category = serializers.IntegerField(required=False, allow_null=True)
    priority = serializers.CharField()
    service = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=200)
    description = serializers.CharField()
    impact = serializers.ChoiceField(choices=Incident.IMPACT_CHOICES, default=Incident.IMPACT_MEDIUM)
    urgency = serializers.ChoiceField(choices=Incident.URGENCY_CHOICES, default=Incident.URGENCY_MEDIUM)
    is_major_incident = serializers.BooleanField(default=False)

    def create(self, validated_data):
        from apps.clients.models import Client
        from apps.services.models import Service
        from apps.sla.models import SLA
        from apps.tickets.models import Category

        request = self.context["request"]
        priority = Priority.objects.get(name=validated_data["priority"])
        sla = SLA.objects.filter(priority=priority, status="active").first()

        ticket = Ticket.objects.create(
            client=Client.objects.get(pk=validated_data["client"]),
            created_by=request.user,
            category=Category.objects.filter(pk=validated_data.get("category")).first(),
            priority=priority,
            service=Service.objects.filter(pk=validated_data.get("service")).first(),
            status=Status.objects.get(name=Status.NEW),
            sla=sla,
            ticket_type=Ticket.TYPE_INCIDENT,
            subject=validated_data["subject"],
            description=validated_data["description"],
        )
        TicketHistory.objects.create(
            ticket=ticket, changed_by=request.user, field_changed="status",
            old_value="", new_value=Status.NEW,
        )
        incident = Incident.objects.create(
            ticket=ticket,
            impact=validated_data["impact"],
            urgency=validated_data["urgency"],
            is_major_incident=validated_data["is_major_incident"],
        )
        return incident
