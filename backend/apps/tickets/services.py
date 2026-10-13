"""
Lógica de negocio del ciclo de vida de un Ticket.

Centraliza aquí (en lugar de en las vistas) las operaciones que
cambian el estado de un ticket, para que el cálculo de tiempos de
respuesta/solución y el registro de historial sean siempre
consistentes sin importar desde qué vista se disparen.
"""
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .attachments import ALLOWED_FORMATS, AttachmentError, validate_image
from .models import Status, Ticket, TicketAttachment, TicketHistory


def _log_history(ticket, user, field, old_value, new_value):
    TicketHistory.objects.create(
        ticket=ticket,
        changed_by=user,
        field_changed=field,
        old_value=str(old_value) if old_value is not None else "",
        new_value=str(new_value) if new_value is not None else "",
    )


def assign_technician(ticket: Ticket, technician, user) -> Ticket:
    """
    Asigna (o reasigna) un técnico al ticket.

    Si el ticket estaba en estado "Nuevo", además lo mueve a
    "Asignado" y registra `assigned_at`, lo que dispara el cálculo
    del tiempo de respuesta.
    """
    old_technician = ticket.technician
    ticket.technician = technician

    if ticket.status.name == Status.NEW:
        assigned_status = Status.objects.get(name=Status.ASSIGNED)
        ticket.status = assigned_status
        ticket.assigned_at = timezone.now()
        if ticket.response_time_minutes is None:
            elapsed = (ticket.assigned_at - ticket.created_at).total_seconds() / 60
            ticket.response_time_minutes = round(elapsed)
        _log_history(ticket, user, "status", Status.NEW, Status.ASSIGNED)

    ticket.save()
    _log_history(
        ticket, user, "technician",
        old_technician.name if old_technician else "Sin asignar",
        technician.name if technician else "Sin asignar",
    )
    return ticket


def change_status(ticket: Ticket, new_status: Status, user) -> Ticket:
    """
    Cambia el estado del ticket y calcula automáticamente los
    tiempos de solución cuando corresponde.

    - Al pasar a "Resuelto" se registra `resolved_at` y se calcula
      `resolution_time_minutes` (si aún no estaba calculado).
    - Al pasar a "Cerrado" se registra `closed_at`.
    """
    old_status = ticket.status
    now = timezone.now()

    if new_status.name == Status.RESOLVED and ticket.resolved_at is None:
        ticket.resolved_at = now
        elapsed = (now - ticket.created_at).total_seconds() / 60
        ticket.resolution_time_minutes = round(elapsed)

    if new_status.name == Status.CLOSED and ticket.closed_at is None:
        ticket.closed_at = now
        if ticket.resolved_at is None:
            ticket.resolved_at = now
            elapsed = (now - ticket.created_at).total_seconds() / 60
            ticket.resolution_time_minutes = round(elapsed)

    ticket.status = new_status
    ticket.save()
    _log_history(ticket, user, "status", old_status.name, new_status.name)
    return ticket


def change_priority(ticket: Ticket, new_priority, user) -> Ticket:
    old_priority = ticket.priority
    ticket.priority = new_priority
    ticket.save()
    _log_history(ticket, user, "priority", old_priority.name, new_priority.name)
    return ticket


def change_type(ticket: Ticket, new_type: str, user) -> Ticket:
    """
    Reclasifica el ticket entre Incidente y Solicitud de servicio.

    Se hace por esta función (y no por un PATCH directo del campo) para
    que cada reclasificación quede registrada en TicketHistory, igual
    que el cambio de prioridad o de estado.
    """
    old_type = ticket.ticket_type
    if old_type == new_type:
        return ticket
    ticket.ticket_type = new_type
    ticket.save()
    labels = dict(Ticket.TYPE_CHOICES)
    _log_history(ticket, user, "ticket_type", labels.get(old_type, old_type), labels.get(new_type, new_type))
    return ticket


def add_attachments(ticket: Ticket, files, user) -> list[TicketAttachment]:
    """
    Adjunta una o varias imágenes al ticket, con semántica de todo o nada:
    primero se validan TODOS los archivos (formato real, tamaño, cantidad
    total por ticket) y solo si todos son válidos se guardan, dentro de una
    transacción.

    Lanza AttachmentError con la lista de problemas encontrados (uno por
    línea) para que el usuario pueda corregirlos todos de una vez.
    """
    if not files:
        raise AttachmentError("Debes adjuntar al menos una imagen.")

    max_files = settings.TICKET_ATTACHMENT_MAX_FILES
    existing = ticket.attachments.count()
    if existing + len(files) > max_files:
        raise AttachmentError(
            f"Un ticket admite máximo {max_files} imágenes (este ya tiene {existing})."
        )

    problems, formats = [], []
    for uploaded in files:
        try:
            formats.append(validate_image(uploaded))
        except AttachmentError as error:
            problems.append(str(error))
    if problems:
        raise AttachmentError("\n".join(problems))

    created = []
    try:
        with transaction.atomic():
            for uploaded, image_format in zip(files, formats):
                content_type, extension = ALLOWED_FORMATS[image_format]
                original_name = uploaded.name
                # La extensión en disco sale del formato detectado, no del nombre enviado.
                uploaded.name = f"upload{extension}"
                created.append(
                    TicketAttachment.objects.create(
                        ticket=ticket,
                        image=uploaded,
                        original_name=original_name[:255],
                        content_type=content_type,
                        size=uploaded.size,
                        uploaded_by=user,
                    )
                )
    except Exception:
        # El disco no es transaccional: si la creación falla a mitad de camino,
        # se eliminan los archivos ya escritos para no dejar huérfanos.
        for attachment in created:
            attachment.image.storage.delete(attachment.image.name)
        raise
    return created
