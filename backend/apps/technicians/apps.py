from django.apps import AppConfig


class TechniciansConfig(AppConfig):
    """Configuración del módulo de Técnicos."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.technicians"
    verbose_name = "Técnicos"
