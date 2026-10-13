import { AlertTriangle } from "lucide-react";

import { Modal } from "./Modal";

/**
 * Diálogo de confirmación genérico, usado antes de cualquier acción
 * que cambie el estado de un registro de forma significativa
 * (activar/desactivar, eliminar). Se construye sobre <Modal /> en
 * vez de ser una ventana aislada, para mantener la misma apariencia
 * (overlay, tarjeta, botón de cerrar) que el resto de la aplicación.
 *
 * Patrón de uso en una página: guardar en estado el registro
 * pendiente de confirmar (`confirmTarget`), renderizar este diálogo
 * solo cuando existe, y limpiar el estado en `onCancel` y al
 * terminar `onConfirm`.
 */
interface ConfirmDialogProps {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel,
  tone = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = tone === "danger";

  return (
    <Modal title={title} onClose={onCancel} widthClass="max-w-sm">
      <div className="flex gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isDanger ? "bg-red-100 text-red-600" : "bg-sira-primary/10 text-sira-primary"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-gray-700">{message}</p>
          {detail && <p className="mt-1 text-sm font-medium text-sira-dark">{detail}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            isDanger ? "bg-red-600 hover:bg-red-700" : "bg-sira-primary hover:bg-sira-dark"
          }`}
        >
          {isLoading ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
