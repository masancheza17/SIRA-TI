from django.apps import AppConfig


class ServicesConfig(AppConfig):
    """Configuración del módulo de Catálogo de Servicios."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.services"
    verbose_name = "Catálogo de Servicios"
