"""Serializers del módulo de Tickets."""
from rest_framework import serializers

from .models import Category, Comment, Priority, Status, Ticket, TicketAttachment, TicketHistory


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class PrioritySerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source="get_name_display", read_only=True)

    class Meta:
        model = Priority
        fields = ["id", "name", "name_display", "level", "color"]


class StatusSerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source="get_name_display", read_only=True)

    class Meta:
        model = Status
        fields = ["id", "name", "name_display", "order", "is_closed"]


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "ticket", "author", "author_name", "content", "is_internal", "created_at"]
        read_only_fields = ["author", "created_at"]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username if obj.author else None


class TicketAttachmentSerializer(serializers.ModelSerializer):
    """
    Metadatos de una imagen adjunta. El archivo en sí NO se expone por URL
    pública: se descarga con GET /api/tickets/{id}/attachments/{att_id}/file/
    (autenticado y limitado a quienes tienen acceso al ticket).
    """

    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = ["id", "original_name", "content_type", "size", "uploaded_by", "uploaded_by_name", "uploaded_at"]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username if obj.uploaded_by else None


class TicketHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketHistory
        fields = ["id", "field_changed", "old_value", "new_value", "changed_by_name", "changed_at"]

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() or obj.changed_by.username if obj.changed_by else None


class TicketListSerializer(serializers.ModelSerializer):
    """Serializer liviano usado en listados y tablas."""

    client_name = serializers.CharField(source="client.name", read_only=True)
    technician_name = serializers.CharField(source="technician.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    priority_name = serializers.CharField(source="priority.get_name_display", read_only=True)
    status_name = serializers.CharField(source="status.get_name_display", read_only=True)
    ticket_type_name = serializers.CharField(source="get_ticket_type_display", read_only=True)
    sla_state = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id", "subject", "client", "client_name", "technician", "technician_name",
            "category", "category_name", "priority", "priority_name", "status", "status_name",
            "ticket_type", "ticket_type_name", "created_at", "sla_state",
        ]

    def get_sla_state(self, obj):
        return obj.sla_compliance()["state"]


class TicketDetailSerializer(serializers.ModelSerializer):
    """Serializer completo usado en el detalle de un ticket."""

    client_name = serializers.CharField(source="client.name", read_only=True)
    technician_name = serializers.CharField(source="technician.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    priority_name = serializers.CharField(source="priority.get_name_display", read_only=True)
    status_name = serializers.CharField(source="status.get_name_display", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True, default=None)
    sla_name = serializers.CharField(source="sla.name", read_only=True, default=None)
    ticket_type_name = serializers.CharField(source="get_ticket_type_display", read_only=True)
    sla_compliance = serializers.SerializerMethodField()
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    history = TicketHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "subject", "description", "solution",
            "client", "client_name", "created_by", "technician", "technician_name",
            "category", "category_name", "priority", "priority_name",
            "service", "service_name", "status", "status_name",
            "sla", "sla_name", "sla_compliance", "ticket_type", "ticket_type_name",
            "created_at", "assigned_at", "resolved_at", "closed_at",
            "response_time_minutes", "resolution_time_minutes",
            "attachments", "comments", "history",
        ]
        # ticket_type es de solo lectura aquí: se cambia únicamente con la
        # acción change_type, que valida el rol y deja registro en el historial.
        read_only_fields = [
            "created_by", "assigned_at", "resolved_at", "closed_at",
            "response_time_minutes", "resolution_time_minutes", "ticket_type",
        ]

    def get_sla_compliance(self, obj):
        return obj.sla_compliance()


class TicketCreateSerializer(serializers.ModelSerializer):
    """
    Serializer usado al crear un ticket.

    `priority` se envía por su nombre legible ("low", "medium",
    "high", "critical") en lugar de su id, para que el frontend no
    necesite conocer las claves primarias del catálogo. Si no se
    especifica un SLA explícito, se asigna automáticamente el SLA
    activo correspondiente a la prioridad elegida, y el estado
    inicial siempre es "Nuevo" sin importar lo que envíe el cliente.
    """

    priority = serializers.SlugRelatedField(slug_field="name", queryset=Priority.objects.all())

    class Meta:
        model = Ticket
        fields = [
            "id", "client", "category", "priority", "service",
            "subject", "description", "ticket_type",
        ]
        # `client` no es obligatorio en el body: cuando quien crea es un
        # Cliente, la vista lo asigna desde su propio perfil (perform_create).
        # Para Administrador/Técnico la vista sigue exigiéndolo.
        extra_kwargs = {"client": {"required": False}}

    def create(self, validated_data):
        priority = validated_data["priority"]
        sla = SLA_model().objects.filter(priority=priority, status="active").first()
        new_status = Status.objects.get(name=Status.NEW)

        ticket = Ticket.objects.create(
            status=new_status,
            sla=sla,
            created_by=self.context["request"].user,
            **validated_data,
        )
        TicketHistory.objects.create(
            ticket=ticket,
            changed_by=self.context["request"].user,
            field_changed="status",
            old_value="",
            new_value=Status.NEW,
        )
        return ticket


def SLA_model():
    """Import diferido para evitar dependencia circular entre apps.tickets y apps.sla."""
    from apps.sla.models import SLA

    return SLA
