"""
Configuración principal del proyecto SIRA TI.

Este archivo centraliza la configuración de Django, DRF, JWT, CORS y
la conexión a PostgreSQL. Todos los valores sensibles se leen desde
variables de entorno (ver .env.example) para no exponer credenciales
en el código fuente.
"""
import sys
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Seguridad básica
# ---------------------------------------------------------------------------
DEBUG = config("DEBUG", default=False, cast=bool)

# Clave por defecto, válida SOLO en desarrollo (DEBUG=True). Con DEBUG=False
# la aplicación se niega a arrancar si no se define una clave propia, para que
# nunca llegue a producción con una clave pública (esta está en el repositorio).
_INSECURE_SECRET_KEYS = {
    "dev-only-insecure-key",
    "cambia-esto-por-una-clave-larga-y-secreta",
}
SECRET_KEY = config("SECRET_KEY", default="dev-only-insecure-key")
if not DEBUG and (SECRET_KEY in _INSECURE_SECRET_KEYS or len(SECRET_KEY) < 32):
    raise ImproperlyConfigured(
        "SECRET_KEY no es segura. Con DEBUG=False debes definir una SECRET_KEY propia "
        "de al menos 32 caracteres. Puedes generar una con: "
        'python -c "from django.core.management.utils import get_random_secret_key; '
        'print(get_random_secret_key())"'
    )

# True cuando se ejecuta `python manage.py test` (se usa para relajar el rate limiting).
TESTING = "test" in sys.argv

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ---------------------------------------------------------------------------
# Aplicaciones instaladas
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # necesario para invalidar refresh tokens
    "corsheaders",
    "django_filters",
]

# Apps propias de SIRA TI, cada una representa un módulo funcional del sistema.
LOCAL_APPS = [
    "apps.users",
    "apps.clients",
    "apps.technicians",
    "apps.tickets",
    "apps.incidents",
    "apps.services",
    "apps.sla",
    "apps.dashboard",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Base de datos (PostgreSQL)
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="sira_ti"),
        "USER": config("POSTGRES_USER", default="sira_user"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="sira_password"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

# ---------------------------------------------------------------------------
# Modelo de usuario personalizado (definido en apps.users)
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internacionalización
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Archivos estáticos y media
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Necesario para iniciar sesión en /admin/ por HTTPS (Render)
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Imágenes adjuntas a tickets (ver apps/tickets/attachments.py).
# Los archivos NO se sirven públicamente desde MEDIA_URL: se descargan por
# un endpoint autenticado que valida el acceso al ticket.
# Si cambias estos valores, actualiza también frontend/src/utils/attachments.ts.
TICKET_ATTACHMENT_MAX_SIZE_MB = config("TICKET_ATTACHMENT_MAX_SIZE_MB", default=5, cast=int)
TICKET_ATTACHMENT_MAX_FILES = config("TICKET_ATTACHMENT_MAX_FILES", default=5, cast=int)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    # Límite de intentos por IP en login y recuperación de contraseña (fuerza bruta).
    # Cada vista declara su `throttle_scope`; las tasas se pueden ajustar por .env.
    # Nota: el contador vive en la caché del proceso (LocMem). Con varios workers de
    # gunicorn cada uno cuenta por separado; para un límite global usar Redis/BD.
    "DEFAULT_THROTTLE_RATES": {
        "login": "1000/min" if TESTING else config("LOGIN_THROTTLE_RATE", default="10/min"),
        "password_reset": (
            "1000/min" if TESTING else config("PASSWORD_RESET_THROTTLE_RATE", default="10/hour")
        ),
    },
    # Detrás de un proxy (Render, Nginx) define NUM_PROXIES=1 para que el límite use la
    # IP real del cliente (X-Forwarded-For) y no la del proxy.
    "NUM_PROXIES": config(
        "NUM_PROXIES", default=None, cast=lambda v: int(v) if v not in (None, "") else None
    ),
}

# ---------------------------------------------------------------------------
# JWT (Simple JWT)
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MIN", default=60, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Frontend y correo (usados por el flujo de recuperación de contraseña)
# ---------------------------------------------------------------------------
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="no-reply@sira-ti.local")

# En desarrollo los correos se imprimen en la consola del backend.
# En producción, configurar un backend SMTP real vía variables de entorno.
EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)

# ---------------------------------------------------------------------------
# HTTPS en producción
# ---------------------------------------------------------------------------
# Actívalo con USE_HTTPS=True cuando el sitio se sirva por HTTPS (Render ya lo hace).
# Se deja apagado por defecto para no romper el desarrollo local por http://.
USE_HTTPS = config("USE_HTTPS", default=False, cast=bool)
if USE_HTTPS:
    # Render termina el TLS en su proxy y reenvía este encabezado a la app.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # HSTS empieza corto (1 hora) a propósito: subirlo a un año (31536000) solo cuando
    # estés seguro de que todo funciona por HTTPS, porque el navegador lo recuerda.
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=3600, cast=int)