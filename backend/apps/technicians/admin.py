"""Registro en el panel de administración de Django para Técnicos."""
from django.contrib import admin

from .models import Technician


@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = ("name", "specialty", "email", "phone", "status", "hire_date")
    list_filter = ("status", "specialty")
    search_fields = ("name", "document", "email")
