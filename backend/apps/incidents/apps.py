from django.apps import AppConfig


class IncidentsConfig(AppConfig):
    """Configuración del módulo de Incidentes."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.incidents"
    verbose_name = "Incidentes"
