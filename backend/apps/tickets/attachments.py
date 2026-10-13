"""
Validación de las imágenes adjuntas a un ticket.

La validación se hace sobre el CONTENIDO real del archivo (abriéndolo con
Pillow) y no sobre la extensión ni sobre el Content-Type que declara el
navegador, porque ambos pueden falsificarse fácilmente.

Reglas:
  - Formatos permitidos: JPEG, PNG y WEBP.
  - Tamaño máximo por archivo y cantidad máxima por ticket: configurables
    (settings.TICKET_ATTACHMENT_MAX_SIZE_MB / TICKET_ATTACHMENT_MAX_FILES).
  - Dimensiones máximas en píxeles, para evitar imágenes diseñadas para
    consumir memoria al procesarse ("decompression bombs").
"""
from django.conf import settings
from PIL import Image

# Formato detectado por Pillow -> (Content-Type, extensión con la que se guarda)
ALLOWED_FORMATS = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}

# 40 megapíxeles: holgado para fotos de celular (~12-50 MP comprimidas ya
# superan el límite de tamaño en MB), y lejos del umbral de riesgo de Pillow.
MAX_PIXELS = 40_000_000


class AttachmentError(Exception):
    """Error de validación de un adjunto, con un mensaje apto para el usuario."""


def max_size_bytes() -> int:
    return settings.TICKET_ATTACHMENT_MAX_SIZE_MB * 1024 * 1024


def validate_image(uploaded_file) -> str:
    """
    Valida un archivo subido y devuelve su formato real ("JPEG", "PNG" o "WEBP").
    Lanza AttachmentError con un mensaje claro si no cumple las reglas.
    """
    name = uploaded_file.name

    if uploaded_file.size == 0:
        raise AttachmentError(f"{name}: el archivo está vacío.")
    if uploaded_file.size > max_size_bytes():
        raise AttachmentError(
            f"{name}: supera el tamaño máximo de {settings.TICKET_ATTACHMENT_MAX_SIZE_MB} MB."
        )

    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            image_format = image.format
            width, height = image.size
            image.verify()
    except Exception:
        # Cualquier fallo al abrir/verificar (archivo corrupto, texto
        # renombrado como .png, bomba de descompresión, etc.).
        raise AttachmentError(f"{name}: no es una imagen válida.") from None
    finally:
        uploaded_file.seek(0)

    if image_format not in ALLOWED_FORMATS:
        raise AttachmentError(f"{name}: formato no permitido. Usa JPG, PNG o WEBP.")
    if width * height > MAX_PIXELS:
        raise AttachmentError(f"{name}: las dimensiones de la imagen son demasiado grandes.")

    return image_format
