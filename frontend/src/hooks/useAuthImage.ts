import { useEffect, useState } from "react";

import api from "@/services/api";

/**
 * Carga una imagen adjunta de un ticket y devuelve una URL local (blob)
 * lista para usar en un <img>.
 *
 * Las imágenes no tienen URL pública: el backend solo las entrega a
 * usuarios autenticados con acceso al ticket. Un <img src="..."> normal
 * no puede enviar el token JWT, así que la imagen se descarga con el
 * cliente Axios (que sí lo adjunta) y se muestra desde memoria.
 */
export function useAuthImage(ticketId: number, attachmentId: number) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setStatus("loading");
    setUrl(null);

    api
      .get<Blob>(`/tickets/${ticketId}/attachments/${attachmentId}/file/`, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ticketId, attachmentId]);

  return { url, status };
}
