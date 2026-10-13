"""
Modelos del módulo de Incidentes.

Según ITIL, un Incidente es una interrupción no planificada de un
servicio. En SIRA TI se modela como una extensión 1 a 1 de Ticket
(apps.tickets.Ticket con ticket_type="incident"), agregando los
atributos propios de un incidente: impacto, urgencia y causa raíz.
Esto evita duplicar toda la lógica de estados/SLA/comentarios que ya
maneja Ticket, y permite que un incidente se gestione con el mismo
flujo que cualquier otro ticket.
"""
from django.db import models


class Incident(models.Model):
    IMPACT_LOW = "low"
    IMPACT_MEDIUM = "medium"
    IMPACT_HIGH = "high"
    IMPACT_CHOICES = [
        (IMPACT_LOW, "Bajo"),
        (IMPACT_MEDIUM, "Medio"),
        (IMPACT_HIGH, "Alto"),
    ]

    URGENCY_LOW = "low"
    URGENCY_MEDIUM = "medium"
    URGENCY_HIGH = "high"
    URGENCY_CHOICES = [
        (URGENCY_LOW, "Baja"),
        (URGENCY_MEDIUM, "Media"),
        (URGENCY_HIGH, "Alta"),
    ]

    ticket = models.OneToOneField(
        "tickets.Ticket", on_delete=models.CASCADE, related_name="incident_detail"
    )
    impact = models.CharField(max_length=10, choices=IMPACT_CHOICES, default=IMPACT_MEDIUM)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default=URGENCY_MEDIUM)
    root_cause = models.TextField(blank=True)
    is_major_incident = models.BooleanField(
        default=False, help_text="Marca incidentes críticos que afectan a múltiples clientes"
    )

    class Meta:
        verbose_name = "Incidente"
        verbose_name_plural = "Incidentes"

    def __str__(self):
        return f"Incidente de ticket #{self.ticket_id}"
