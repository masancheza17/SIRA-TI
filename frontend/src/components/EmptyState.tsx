import type { LucideIcon } from "lucide-react";

/** Estado vacío estándar para tablas y listados sin datos. */
export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-sira-soft" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
