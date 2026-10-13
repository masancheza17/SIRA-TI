"""Registro en el panel de administración de Django para Incidentes."""
from django.contrib import admin

from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("ticket", "impact", "urgency", "is_major_incident")
    list_filter = ("impact", "urgency", "is_major_incident")
