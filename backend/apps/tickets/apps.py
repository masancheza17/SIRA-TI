from django.apps import AppConfig


class TicketsConfig(AppConfig):
    """Configuración del módulo de Tickets."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tickets"
    verbose_name = "Tickets"
