from django.apps import AppConfig


class SlaConfig(AppConfig):
    """Configuración del módulo de SLA."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.sla"
    verbose_name = "SLA"
