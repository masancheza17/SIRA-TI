from django.apps import AppConfig


class UsersConfig(AppConfig):
    """Configuración del módulo de Usuarios."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Usuarios"
