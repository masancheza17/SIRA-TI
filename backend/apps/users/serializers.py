"""Serializers del módulo de Usuarios."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RoleAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer de login que además de los tokens JWT (access/refresh)
    devuelve el rol y los datos básicos del usuario, para que el
    frontend pueda redirigir inmediatamente al dashboard correcto
    (Administrador, Técnico o Cliente) sin llamadas adicionales.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role_name
        token["full_name"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role_name
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "full_name": self.user.get_full_name() or self.user.username,
            "email": self.user.email,
            "role": self.user.role_name,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "role_name", "document", "phone", "is_active", "date_joined",
        ]
        read_only_fields = ["date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "document", "phone", "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Usado en el cambio de contraseña autenticado."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    """Paso 1 de recuperación de contraseña: el usuario indica su correo."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Paso 2: el usuario confirma con el uid/token recibidos por correo."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
