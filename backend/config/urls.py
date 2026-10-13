"""
URLs raíz de SIRA TI.

Cada módulo funcional expone sus propias rutas bajo /api/<modulo>/.
Esto mantiene el enrutamiento organizado y facilita agregar nuevos
módulos sin tocar los existentes.
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Autenticación (login, refresh, recuperación de contraseña)
    path("api/auth/", include("apps.users.urls_auth")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Módulos funcionales
    path("api/users/", include("apps.users.urls")),
    path("api/clients/", include("apps.clients.urls")),
    path("api/technicians/", include("apps.technicians.urls")),
    path("api/tickets/", include("apps.tickets.urls")),
    path("api/incidents/", include("apps.incidents.urls")),
    path("api/services/", include("apps.services.urls")),
    path("api/sla/", include("apps.sla.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
]
