"""Serializers del módulo de Catálogo de Servicios."""
from rest_framework import serializers

from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    responsible_name = serializers.CharField(source="responsible.name", read_only=True, default=None)
    sla_name = serializers.CharField(source="sla.name", read_only=True, default=None)

    class Meta:
        model = Service
        fields = [
            "id", "name", "description", "category", "category_name",
            "responsible", "responsible_name", "schedule", "sla", "sla_name", "status",
        ]
