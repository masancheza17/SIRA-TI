"""Modelos del módulo de Técnicos."""
from django.conf import settings
from django.db import models


class Technician(models.Model):
    """
    Técnico de soporte encargado de atender tickets asignados.

    Vinculado opcionalmente a un usuario del sistema (rol
    "technician") para poder iniciar sesión en el portal técnico.
    """

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Activo"),
        (STATUS_INACTIVE, "Inactivo"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="technician_profile",
    )
    name = models.CharField(max_length=150)
    document = models.CharField(max_length=30, unique=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    specialty = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    hire_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Técnico"
        verbose_name_plural = "Técnicos"
        ordering = ["name"]

    def __str__(self):
        return self.name
