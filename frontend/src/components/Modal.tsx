import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Modal genérico reutilizable en formularios de creación/edición. */
export function Modal({
  title,
  onClose,
  children,
  widthClass = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sira-dark/50 p-4">
      <div className={`w-full ${widthClass} rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-sira-soft/40 px-6 py-4">
          <h2 className="text-lg font-semibold text-sira-dark">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
