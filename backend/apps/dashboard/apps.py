from django.apps import AppConfig


class DashboardConfig(AppConfig):
    """Configuración del módulo de Dashboard."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.dashboard"
    verbose_name = "Dashboard"
