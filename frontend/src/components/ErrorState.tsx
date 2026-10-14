import { AlertTriangle } from "lucide-react";

/** Mensaje de error estándar para fallas de carga de la API. */
export function ErrorState({ message = "No fue posible cargar la información." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
