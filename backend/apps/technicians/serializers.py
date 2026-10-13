"""Serializers del módulo de Técnicos."""
from rest_framework import serializers

from .models import Technician


class TechnicianSerializer(serializers.ModelSerializer):
    open_tickets_count = serializers.SerializerMethodField()

    class Meta:
        model = Technician
        fields = [
            "id", "user", "name", "document", "email", "phone",
            "specialty", "status", "hire_date", "open_tickets_count",
        ]

    def get_open_tickets_count(self, obj):
        return obj.tickets_assigned.exclude(status__is_closed=True).count()

    def validate_document(self, value):
        qs = Technician.objects.filter(document=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un técnico registrado con este documento.")
        return value
