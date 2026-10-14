import type { LucideIcon } from "lucide-react";

/**
 * Tarjeta de KPI usada en los dashboards. Muestra un valor numérico
 * grande, una etiqueta descriptiva y un ícono de Lucide.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneStyles: Record<string, string> = {
    default: "bg-sira-primary/10 text-sira-primary",
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-red-100 text-red-600",
    success: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="rounded-lg border border-sira-soft/50 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${toneStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-sira-dark">{value}</p>
    </div>
  );
}
