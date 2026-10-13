"""Modelos del módulo de Clientes."""
from django.conf import settings
from django.db import models


class Client(models.Model):
    """
    Cliente que solicita soporte técnico.

    Puede opcionalmente estar vinculado a un usuario del sistema
    (rol "client") para poder iniciar sesión y crear/consultar sus
    propios tickets desde el portal de cliente.
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
        related_name="client_profile",
    )
    name = models.CharField(max_length=150)
    document = models.CharField(max_length=30, unique=True)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.company})" if self.company else self.name
