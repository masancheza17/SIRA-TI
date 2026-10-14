"""Vistas del módulo de Tickets."""
from django.http import FileResponse, Http404
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.technicians.models import Technician
from apps.users.models import Role

from . import services
from .attachments import AttachmentError
from .models import Category, Comment, Priority, Status, Ticket
from .serializers import (
    CategorySerializer,
    CommentSerializer,
    PrioritySerializer,
    StatusSerializer,
    TicketAttachmentSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


class PriorityViewSet(viewsets.ModelViewSet):
    queryset = Priority.objects.all()
    serializer_class = PrioritySerializer
    permission_classes = [IsAuthenticated]


class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    permission_classes = [IsAuthenticated]


class TicketViewSet(viewsets.ModelViewSet):
    """
    CRUD y acciones sobre Tickets.

    El queryset se filtra según el rol del usuario autenticado:
    - Administrador: ve todos los tickets.
    - Técnico: solo ve los tickets que tiene asignados.
    - Cliente: solo ve los tickets de su propio perfil de cliente.

    Esto se aplica siempre en el backend (get_queryset), no depende
    de que el frontend filtre correctamente.
    """

    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "priority", "category", "technician", "client", "ticket_type"]
    search_fields = ["subject", "description"]

    def get_serializer_class(self):
        if self.action == "list":
            return TicketListSerializer
        if self.action == "create":
            return TicketCreateSerializer
        return TicketDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            "client", "technician", "category", "priority", "status", "service", "sla"
        ).prefetch_related("comments", "history", "attachments")

        role = user.role_name
        if role == Role.ADMIN:
            return qs
        if role == Role.TECHNICIAN:
            return qs.filter(technician__user=user)
        if role == Role.CLIENT:
            return qs.filter(client__user=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        # Un cliente solo puede crear tickets a nombre de su propio
        # perfil de cliente, sin importar qué "client" envíe en el body.
        if user.role_name == Role.CLIENT:
            client_profile = getattr(user, "client_profile", None)
            if client_profile is None:
                raise PermissionDenied("Tu usuario no tiene un perfil de cliente asociado.")
            serializer.save(client=client_profile)
        else:
            if "client" not in serializer.validated_data:
                raise ValidationError({"client": "Este campo es requerido."})
            serializer.save()

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Asigna (o reasigna) un técnico al ticket. Solo Admin/Técnico."""
        if request.user.role_name not in (Role.ADMIN, Role.TECHNICIAN):
            raise PermissionDenied("No tienes permisos para asignar técnicos.")

        ticket = self.get_object()
        technician_id = request.data.get("technician")
        try:
            technician = Technician.objects.get(pk=technician_id)
        except (Technician.DoesNotExist, ValueError, TypeError):
            raise ValidationError({"technician": "Técnico no válido."})

        ticket = services.assign_technician(ticket, technician, request.user)
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        """Cambia el estado del ticket, calculando tiempos de SLA."""
        ticket = self.get_object()
        status_name = request.data.get("status")
        try:
            new_status = Status.objects.get(name=status_name)
        except Status.DoesNotExist:
            raise ValidationError({"status": "Estado no válido."})

        ticket = services.change_status(ticket, new_status, request.user)
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def change_priority(self, request, pk=None):
        """Cambia la prioridad del ticket. Solo Admin/Técnico."""
        if request.user.role_name not in (Role.ADMIN, Role.TECHNICIAN):
            raise PermissionDenied("No tienes permisos para cambiar la prioridad.")

        ticket = self.get_object()
        priority_name = request.data.get("priority")
        try:
            new_priority = Priority.objects.get(name=priority_name)
        except Priority.DoesNotExist:
            raise ValidationError({"priority": "Prioridad no válida."})

        ticket = services.change_priority(ticket, new_priority, request.user)
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def change_type(self, request, pk=None):
        """Reclasifica el ticket como Incidente o Solicitud. Solo Admin/Técnico."""
        if request.user.role_name not in (Role.ADMIN, Role.TECHNICIAN):
            raise PermissionDenied("No tienes permisos para cambiar la clasificación.")

        ticket = self.get_object()
        new_type = request.data.get("ticket_type")
        if new_type not in dict(Ticket.TYPE_CHOICES):
            raise ValidationError({"ticket_type": "Tipo de ticket no válido."})

        services.change_type(ticket, new_type, request.user)
        # Se vuelve a consultar el ticket: get_queryset() usa prefetch de
        # `history`, y el objeto original quedaría con el historial anterior
        # al cambio recién registrado.
        ticket = self.get_queryset().get(pk=ticket.pk)
        return Response(TicketDetailSerializer(ticket).data)

    @action(detail=True, methods=["get", "post"], parser_classes=[MultiPartParser, FormParser])
    def attachments(self, request, pk=None):
        """
        GET: lista las imágenes adjuntas del ticket.
        POST (multipart, campo repetido `images`): adjunta una o varias imágenes.

        Cualquier usuario con acceso al ticket (el cliente dueño, el técnico
        asignado o un administrador) puede verlas y agregar más, salvo que el
        ticket esté cerrado. Es todo o nada: si una imagen no es válida, no se
        guarda ninguna y se devuelven todos los problemas encontrados.
        """
        ticket = self.get_object()

        if request.method == "GET":
            return Response(TicketAttachmentSerializer(ticket.attachments.all(), many=True).data)

        if ticket.status.name == Status.CLOSED:
            raise ValidationError({"images": ["El ticket está cerrado: no se pueden agregar imágenes."]})

        try:
            created = services.add_attachments(ticket, request.FILES.getlist("images"), request.user)
        except AttachmentError as error:
            raise ValidationError({"images": str(error).split("\n")}) from None
        return Response(
            TicketAttachmentSerializer(created, many=True).data, status=http_status.HTTP_201_CREATED
        )

    @action(
        detail=True, methods=["get"], url_path=r"attachments/(?P<attachment_id>\d+)/file",
        url_name="attachment-file",
    )
    def attachment_file(self, request, pk=None, attachment_id=None):
        """
        Descarga el archivo de una imagen adjunta. Pasa por get_object(), así que
        aplica el mismo control de acceso por rol que el resto del ticket: un
        cliente no puede obtener imágenes de tickets ajenos aunque conozca el id.
        """
        ticket = self.get_object()
        attachment = ticket.attachments.filter(pk=attachment_id).first()
        if attachment is None:
            raise Http404
        try:
            file_handle = attachment.image.open("rb")
        except FileNotFoundError:
            raise Http404("El archivo ya no está disponible.") from None

        response = FileResponse(
            file_handle, content_type=attachment.content_type, as_attachment=False,
            filename=attachment.original_name,
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, max-age=3600"
        return response

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        """Lista o agrega comentarios al ticket."""
        ticket = self.get_object()

        if request.method == "GET":
            serializer = CommentSerializer(ticket.comments.all(), many=True)
            return Response(serializer.data)

        # Un cliente nunca puede crear comentarios internos.
        is_internal = request.data.get("is_internal", False)
        if request.user.role_name == Role.CLIENT:
            is_internal = False

        comment = Comment.objects.create(
            ticket=ticket,
            author=request.user,
            content=request.data.get("content", ""),
            is_internal=is_internal,
        )
        return Response(CommentSerializer(comment).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Atajo para cerrar directamente un ticket resuelto."""
        ticket = self.get_object()
        closed_status = Status.objects.get(name=Status.CLOSED)
        solution = request.data.get("solution")
        if solution:
            ticket.solution = solution
            ticket.save(update_fields=["solution"])
        ticket = services.change_status(ticket, closed_status, request.user)
        return Response(TicketDetailSerializer(ticket).data)
