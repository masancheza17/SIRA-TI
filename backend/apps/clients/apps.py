from django.apps import AppConfig


class ClientsConfig(AppConfig):
    """Configuración del módulo de Clientes."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clients"
    verbose_name = "Clientes"
