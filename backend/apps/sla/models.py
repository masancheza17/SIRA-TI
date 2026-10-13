"""Modelos del módulo de SLA (Acuerdos de Nivel de Servicio)."""
from django.db import models


class SLA(models.Model):
    """
    Acuerdo de Nivel de Servicio.

    Define, por prioridad, los tiempos máximos de respuesta y
    solución en minutos. El cumplimiento real contra estos tiempos
    se calcula en `Ticket.sla_compliance()` (apps.tickets.models),
    siempre en backend.
    """

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Activo"),
        (STATUS_INACTIVE, "Inactivo"),
    ]

    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    priority = models.ForeignKey(
        "tickets.Priority", on_delete=models.PROTECT, related_name="slas"
    )
    max_response_time = models.PositiveIntegerField(help_text="Minutos máximos de respuesta")
    max_resolution_time = models.PositiveIntegerField(help_text="Minutos máximos de solución")
    schedule = models.CharField(
        max_length=100,
        default="Lunes a viernes 8:00-18:00",
        help_text="Horario de cobertura del SLA",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    class Meta:
        verbose_name = "SLA"
        verbose_name_plural = "SLA"
        ordering = ["priority__level"]

    def __str__(self):
        return f"{self.name} ({self.priority})"
