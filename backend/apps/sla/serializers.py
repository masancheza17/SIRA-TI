"""Serializers del módulo de SLA."""
from rest_framework import serializers

from apps.tickets.serializers import PrioritySerializer

from .models import SLA


class SLASerializer(serializers.ModelSerializer):
    priority_detail = PrioritySerializer(source="priority", read_only=True)

    class Meta:
        model = SLA
        fields = [
            "id", "name", "description", "priority", "priority_detail",
            "max_response_time", "max_resolution_time", "schedule", "status",
        ]
