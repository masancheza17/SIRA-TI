"""Registro en el panel de administración de Django para Clientes."""
from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "document", "email", "phone", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "company", "document", "email")
