"""
Modelos del módulo de Tickets.

Este módulo es el núcleo funcional de SIRA TI. Contiene los
catálogos de Categoría, Prioridad y Estado, el modelo Ticket
(que también sirve de base para los Incidentes, ver apps.incidents),
y los modelos de auditoría Comment y TicketHistory, además de
TicketAttachment (imágenes de evidencia adjuntas al ticket).
"""
import os
import uuid

from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone


class Category(models.Model):
    """Categoría del ticket (ej. Hardware, Software, Redes)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Priority(models.Model):
    """
    Prioridad del ticket.

    `level` define el orden de severidad (mayor número = más urgente)
    y se usa para ordenar tickets y para vincular la Prioridad con el
    SLA que le corresponde.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    NAME_CHOICES = [
        (LOW, "Baja"),
        (MEDIUM, "Media"),
        (HIGH, "Alta"),
        (CRITICAL, "Crítica"),
    ]

    name = models.CharField(max_length=10, choices=NAME_CHOICES, unique=True)
    level = models.PositiveSmallIntegerField(default=1, help_text="1=Baja ... 4=Crítica")
    color = models.CharField(max_length=7, default="#468189", help_text="Color hexadecimal para la UI")

    class Meta:
        verbose_name = "Prioridad"
        verbose_name_plural = "Prioridades"
        ordering = ["level"]

    def __str__(self):
        return self.get_name_display()


class Status(models.Model):
    """
    Estado del ciclo de vida del ticket.

    `is_closed` marca los estados que se consideran finales
    (Resuelto, Cerrado) y se usa en los cálculos de KPIs y SLA para
    saber si un ticket ya dejó de "correr" contra el tiempo del SLA.
    """

    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    RESOLVED = "resolved"
    CLOSED = "closed"
    NAME_CHOICES = [
        (NEW, "Nuevo"),
        (ASSIGNED, "Asignado"),
        (IN_PROGRESS, "En proceso"),
        (ON_HOLD, "En espera"),
        (RESOLVED, "Resuelto"),
        (CLOSED, "Cerrado"),
    ]

    name = models.CharField(max_length=15, choices=NAME_CHOICES, unique=True)
    order = models.PositiveSmallIntegerField(default=1)
    is_closed = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Estado"
        verbose_name_plural = "Estados"
        ordering = ["order"]

    def __str__(self):
        return self.get_name_display()


class Ticket(models.Model):
    """
    Ticket / solicitud de servicio.

    Es la entidad central del sistema. Un ticket puede representar
    una solicitud de servicio simple o, cuando tiene un registro
    relacionado en apps.incidents.Incident, un incidente formal
    según ITIL (con impacto, urgencia y causa raíz).

    El cálculo de cumplimiento de SLA se realiza en backend mediante
    el método `sla_compliance()` para evitar que pueda ser manipulado
    desde el frontend.
    """

    TYPE_REQUEST = "request"
    TYPE_INCIDENT = "incident"
    TYPE_CHOICES = [
        (TYPE_REQUEST, "Solicitud de servicio"),
        (TYPE_INCIDENT, "Incidente"),
    ]

    client = models.ForeignKey(
        "clients.Client", on_delete=models.PROTECT, related_name="tickets"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="tickets_created",
    )
    technician = models.ForeignKey(
        "technicians.Technician",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets_assigned",
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="tickets"
    )
    priority = models.ForeignKey(
        Priority, on_delete=models.PROTECT, related_name="tickets"
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name="tickets")
    sla = models.ForeignKey(
        "sla.SLA", on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets"
    )
    ticket_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_REQUEST)

    subject = models.CharField(max_length=200)
    description = models.TextField()
    solution = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Tiempos calculados en minutos, se completan automáticamente
    # cuando el ticket cambia de estado (ver apps.tickets.services).
    response_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    resolution_time_minutes = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.id} - {self.subject}"

    # ------------------------------------------------------------------
    # Lógica de negocio de SLA
    # ------------------------------------------------------------------
    def sla_compliance(self):
        """
        Calcula el estado de cumplimiento del SLA en tiempo real.

        Devuelve un diccionario con el estado ("cumplido",
        "proximo_a_vencer", "incumplido" o "sin_sla"), los minutos
        transcurridos y los minutos restantes hasta el vencimiento
        del tiempo máximo de solución. Se calcula siempre en backend
        para que no pueda alterarse desde el cliente.
        """
        if not self.sla:
            return {"state": "sin_sla", "elapsed_minutes": None, "remaining_minutes": None}

        elapsed = (timezone.now() - self.created_at).total_seconds() / 60
        max_resolution = self.sla.max_resolution_time

        if self.status.is_closed:
            resolved_elapsed = None
            if self.resolved_at:
                resolved_elapsed = (self.resolved_at - self.created_at).total_seconds() / 60
            state = "cumplido" if (resolved_elapsed or 0) <= max_resolution else "incumplido"
            return {
                "state": state,
                "elapsed_minutes": round(resolved_elapsed or elapsed, 2),
                "remaining_minutes": None,
            }

        remaining = max_resolution - elapsed
        if remaining <= 0:
            state = "incumplido"
        elif remaining <= max_resolution * 0.2:
            state = "proximo_a_vencer"
        else:
            state = "cumplido"

        return {
            "state": state,
            "elapsed_minutes": round(elapsed, 2),
            "remaining_minutes": round(remaining, 2),
        }


class Comment(models.Model):
    """Comentario / nota de seguimiento sobre un ticket."""

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    is_internal = models.BooleanField(
        default=False, help_text="Si es interno, el cliente no puede verlo."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Comentario"
        verbose_name_plural = "Comentarios"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comentario de {self.author} en ticket #{self.ticket_id}"


class TicketHistory(models.Model):
    """
    Registro de auditoría de cambios sobre un ticket.

    Se crea automáticamente cada vez que cambia un campo relevante
    (estado, prioridad, técnico asignado, etc.) para mantener
    trazabilidad completa del ciclo de vida del ticket.
    """

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="history")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    field_changed = models.CharField(max_length=50)
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Historial de ticket"
        verbose_name_plural = "Historial de tickets"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Ticket #{self.ticket_id}: {self.field_changed} -> {self.new_value}"


def ticket_attachment_path(instance, filename):
    """
    Ruta de almacenamiento: tickets/<id_ticket>/<uuid>.<ext>.

    El nombre original que envía el usuario nunca se usa como ruta en
    disco (evita colisiones y rutas manipuladas); se conserva solo como
    dato informativo en `original_name`.
    """
    extension = os.path.splitext(filename)[1].lower()
    return f"tickets/{instance.ticket_id}/{uuid.uuid4().hex}{extension}"


class TicketAttachment(models.Model):
    """
    Imagen de evidencia adjunta a un ticket.

    Las imágenes se validan por su contenido real (ver attachments.py) y
    se descargan mediante un endpoint autenticado, de modo que solo ven
    el archivo quienes también tienen acceso al ticket.
    """

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="attachments")
    image = models.ImageField(upload_to=ticket_attachment_path)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=50)
    size = models.PositiveIntegerField(help_text="Tamaño en bytes.")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ticket_attachments",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Adjunto de ticket"
        verbose_name_plural = "Adjuntos de tickets"
        ordering = ["uploaded_at", "id"]

    def __str__(self):
        return f"{self.original_name} (ticket #{self.ticket_id})"


@receiver(post_delete, sender=TicketAttachment)
def delete_attachment_file(sender, instance, **kwargs):
    """
    Borra el archivo del disco cuando se elimina el registro (incluido el
    borrado en cascada al eliminar un ticket). Se hace al confirmar la
    transacción para no perder el archivo si esta se revierte.
    """
    storage, name = instance.image.storage, instance.image.name
    if name:
        transaction.on_commit(lambda: storage.delete(name))
