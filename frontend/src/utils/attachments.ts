import api from "@/services/api";

/**
 * Reglas de las imágenes adjuntas a un ticket.
 *
 * IMPORTANTE: deben coincidir con las del backend
 * (settings.TICKET_ATTACHMENT_MAX_SIZE_MB / TICKET_ATTACHMENT_MAX_FILES).
 * Esta validación solo da respuesta inmediata al usuario; el backend
 * siempre vuelve a validar el contenido real de cada archivo.
 */
export const ATTACHMENT_RULES = {
  maxFiles: 5,
  maxSizeMB: 5,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  allowedLabel: "JPG, PNG o WEBP",
} as const;

/** Valor para el atributo `accept` del <input type="file">. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_RULES.allowedExtensions.join(",");

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Devuelve un mensaje de error si el archivo no cumple las reglas, o null si es válido. */
export function validateImageFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ATTACHMENT_RULES.allowedExtensions.some((ext) => lowerName.endsWith(ext));
  const hasAllowedType = (ATTACHMENT_RULES.allowedMimeTypes as readonly string[]).includes(file.type);

  if (!hasAllowedExtension || !hasAllowedType) {
    return `${file.name}: formato no permitido. Usa ${ATTACHMENT_RULES.allowedLabel}.`;
  }
  if (file.size === 0) {
    return `${file.name}: el archivo está vacío.`;
  }
  if (file.size > ATTACHMENT_RULES.maxSizeMB * 1024 * 1024) {
    return `${file.name}: supera el tamaño máximo de ${ATTACHMENT_RULES.maxSizeMB} MB.`;
  }
  return null;
}

/**
 * Extrae los mensajes de error que devuelve el backend al subir imágenes
 * ({ images: ["..."] }), o un mensaje genérico si la respuesta no los trae.
 */
export function extractUploadErrors(error: unknown): string[] {
  const data = (error as { response?: { data?: { images?: string[] } } })?.response?.data;
  if (data?.images?.length) return data.images;
  return ["No fue posible subir las imágenes. Verifica tu conexión e inténtalo nuevamente."];
}

/**
 * Sube imágenes a un ticket existente.
 *
 * Se fuerza `multipart/form-data` en esta petición porque el cliente Axios
 * del proyecto usa `application/json` por defecto, y con ese valor Axios
 * convertiría el FormData a JSON y los archivos se perderían. El navegador
 * completa el "boundary" del multipart por su cuenta.
 */
export async function uploadTicketImages(ticketId: number | string, files: File[]): Promise<void> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  await api.post(`/tickets/${ticketId}/attachments/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
