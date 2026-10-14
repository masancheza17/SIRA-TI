import { Download, ImageOff, Loader2 } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/Modal";
import { useAuthImage } from "@/hooks/useAuthImage";
import type { TicketAttachment } from "@/types";
import { formatFileSize } from "@/utils/attachments";

/**
 * Galería de imágenes adjuntas de un ticket. Cada miniatura abre la imagen
 * ampliada en un modal, desde donde también se puede descargar.
 */
export function AttachmentGallery({
  ticketId,
  attachments,
}: {
  ticketId: number;
  attachments: TicketAttachment[];
}) {
  const [selected, setSelected] = useState<TicketAttachment | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <button
              type="button"
              onClick={() => setSelected(attachment)}
              className="block w-full text-left"
              title={attachment.original_name}
            >
              <div className="aspect-square overflow-hidden rounded-md border border-sira-soft/60 bg-gray-50 transition-shadow hover:shadow-md">
                <AuthImage
                  ticketId={ticketId}
                  attachmentId={attachment.id}
                  alt={attachment.original_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-1 truncate text-xs text-gray-600">{attachment.original_name}</p>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <Modal title={selected.original_name} onClose={() => setSelected(null)} widthClass="max-w-3xl">
          <Lightbox ticketId={ticketId} attachment={selected} />
        </Modal>
      )}
    </>
  );
}

function Lightbox({ ticketId, attachment }: { ticketId: number; attachment: TicketAttachment }) {
  const { url, status } = useAuthImage(ticketId, attachment.id);

  return (
    <div>
      <div className="flex min-h-[200px] items-center justify-center rounded-md bg-gray-50">
        {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-sira-primary" />}
        {status === "error" && <p className="text-sm text-gray-500">No fue posible cargar la imagen.</p>}
        {url && <img src={url} alt={attachment.original_name} className="max-h-[65vh] max-w-full object-contain" />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
        <p>
          {formatFileSize(attachment.size)}
          {attachment.uploaded_by_name ? ` · subida por ${attachment.uploaded_by_name}` : ""}
          {" · "}
          {new Date(attachment.uploaded_at).toLocaleString("es-CO")}
        </p>
        {url && (
          <a
            href={url}
            download={attachment.original_name}
            className="flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Descargar
          </a>
        )}
      </div>
    </div>
  );
}

function AuthImage({
  ticketId,
  attachmentId,
  alt,
  className,
}: {
  ticketId: number;
  attachmentId: number;
  alt: string;
  className?: string;
}) {
  const { url, status } = useAuthImage(ticketId, attachmentId);

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-sira-primary" />
      </div>
    );
  }
  if (status === "error" || !url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
        <ImageOff className="h-5 w-5" />
        <span className="text-[11px]">No disponible</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
