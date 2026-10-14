"""Vistas del módulo de Usuarios."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin
from .serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RoleAwareTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
)

User = get_user_model()


class RoleAwareTokenObtainPairView(TokenObtainPairView):
    """Login (POST /api/auth/login/). Devuelve tokens JWT + rol del usuario."""

    serializer_class = RoleAwareTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD de usuarios del sistema.

    Restringido a Administradores, salvo la acción `me`, que
    cualquier usuario autenticado puede consultar para obtener su
    propio perfil (usada por el frontend al cargar la sesión).
    """

    queryset = User.objects.select_related("role").all().order_by("-date_joined")
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "email", "first_name", "last_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == "me":
            return [IsAuthenticated()]
        return [IsAdmin()]

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"detail": "La contraseña actual no es correcta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Contraseña actualizada correctamente."})


class PasswordResetRequestView(APIView):
    """
    Paso 1 de recuperación de contraseña (POST /api/auth/password-reset/).

    Genera un uid + token firmado con el generador estándar de Django
    y lo envía por correo. En desarrollo el backend de correo está
    configurado por consola (ver config/settings.py), así que el
    enlace aparece en los logs del backend en lugar de un correo real.
    Por seguridad, la respuesta es siempre la misma exista o no el
    correo, para no revelar qué correos están registrados.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="Recuperación de contraseña - SIRA TI",
                message=f"Para restablecer tu contraseña ingresa a: {reset_link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )

        return Response(
            {"detail": "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña."}
        )


class PasswordResetConfirmView(APIView):
    """Paso 2 de recuperación de contraseña (POST /api/auth/password-reset/confirm/)."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Enlace inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"detail": "El enlace expiró o no es válido."}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(data["new_password"])
        user.save()
        return Response({"detail": "Contraseña restablecida correctamente."})
