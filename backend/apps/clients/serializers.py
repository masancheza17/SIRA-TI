"""Serializers del módulo de Clientes."""
from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "id", "user", "name", "document", "company", "email",
            "phone", "address", "status", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_document(self, value):
        qs = Client.objects.filter(document=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un cliente registrado con este documento.")
        return value
