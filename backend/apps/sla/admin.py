"""Registro en el panel de administración de Django para SLA."""
from django.contrib import admin

from .models import SLA


@admin.register(SLA)
class SLAAdmin(admin.ModelAdmin):
    list_display = ("name", "priority", "max_response_time", "max_resolution_time", "status")
    list_filter = ("status", "priority")
