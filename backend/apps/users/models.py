"""
Modelos del módulo de Usuarios.

Define el modelo de Rol (Role) y el modelo de Usuario personalizado
(User), que extiende AbstractUser de Django agregando el rol,
documento y teléfono. Todo el control de acceso por rol del sistema
(Administrador, Técnico, Cliente) se apoya en este modelo.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """
    Catálogo de roles del sistema.

    Se modela como tabla independiente (en lugar de choices fijos)
    para permitir que el administrador consulte roles desde el admin,
    aunque la lógica de permisos del sistema solo reconoce los tres
    roles base: admin, technician, client.
    """

    ADMIN = "admin"
    TECHNICIAN = "technician"
    CLIENT = "client"

    ROLE_CHOICES = [
        (ADMIN, "Administrador"),
        (TECHNICIAN, "Técnico"),
        (CLIENT, "Cliente"),
    ]

    name = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.get_name_display()


class User(AbstractUser):
    """
    Usuario del sistema SIRA TI.

    Extiende el usuario base de Django agregando el rol (que determina
    a qué módulos y datos puede acceder), documento y teléfono. Los
    perfiles de Cliente y Técnico se vinculan opcionalmente a un
    usuario mediante OneToOneField en sus respectivas apps, para que
    puedan iniciar sesión en la plataforma.
    """

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
        help_text="Rol del usuario. Determina el acceso a módulos y datos.",
    )
    document = models.CharField(max_length=30, blank=True)
    phone = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def role_name(self):
        return self.role.name if self.role else None
