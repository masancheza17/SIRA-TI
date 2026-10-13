"""Modelos del módulo de Catálogo de Servicios (ITIL)."""
from django.db import models


class Service(models.Model):
    """
    Servicio del catálogo ITIL (ej. Soporte de hardware, Gestión de
    usuarios). Cada servicio puede tener un responsable (técnico) y
    un SLA asociado que se usa como SLA por defecto al crear tickets
    relacionados con este servicio.
    """

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Activo"),
        (STATUS_INACTIVE, "Inactivo"),
    ]

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        "tickets.Category", on_delete=models.SET_NULL, null=True, blank=True, related_name="services"
    )
    responsible = models.ForeignKey(
        "technicians.Technician",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services_responsible",
    )
    schedule = models.CharField(max_length=100, default="Lunes a viernes 8:00-18:00")
    sla = models.ForeignKey(
        "sla.SLA", on_delete=models.SET_NULL, null=True, blank=True, related_name="services"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Catálogo de Servicios"
        ordering = ["name"]

    def __str__(self):
        return self.name
