"""Registro en el panel de administración de Django para Tickets."""
from django.contrib import admin

from .models import Category, Comment, Priority, Status, Ticket, TicketHistory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")


@admin.register(Priority)
class PriorityAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "color")


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "is_closed")


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


class TicketHistoryInline(admin.TabularInline):
    model = TicketHistory
    extra = 0
    readonly_fields = ("changed_by", "field_changed", "old_value", "new_value", "changed_at")


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "id", "subject", "client", "technician", "priority", "status", "ticket_type", "created_at",
    )
    list_filter = ("status", "priority", "ticket_type", "category")
    search_fields = ("subject", "description", "client__name")
    inlines = [CommentInline, TicketHistoryInline]
