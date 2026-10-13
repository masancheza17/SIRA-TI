"""Registro en el panel de administración de Django para Servicios."""
from django.contrib import admin

from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "responsible", "sla", "status")
    list_filter = ("status", "category")
