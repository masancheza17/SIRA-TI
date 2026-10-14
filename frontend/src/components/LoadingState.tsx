import { Loader2 } from "lucide-react";

/** Indicador de carga estándar. */
export function LoadingState({ message = "Cargando información..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-sira-primary" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
