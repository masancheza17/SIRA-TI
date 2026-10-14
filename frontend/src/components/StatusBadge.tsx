import type { SlaState, TicketType } from "@/types";

/**
 * Badge de estado de ticket. Los colores usan exclusivamente la
 * paleta corporativa de SIRA TI (ver tailwind.config.js), con
 * variantes neutras (ámbar/rojo) solo para las alertas de SLA
 * incumplido, donde el contraste de alerta es funcionalmente
 * necesario.
 */
const STATUS_STYLES: Record<string, string> = {
  new: "bg-sira-soft/40 text-sira-dark",
  assigned: "bg-sira-secondary/20 text-sira-dark",
  in_progress: "bg-sira-primary/20 text-sira-primary",
  on_hold: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-sira-secondary/20 text-sira-secondary",
  medium: "bg-sira-primary/20 text-sira-primary",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  const style = PRIORITY_STYLES[priority] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

const SLA_STYLES: Record<SlaState, { style: string; label: string }> = {
  cumplido: { style: "bg-emerald-100 text-emerald-700", label: "Cumplido" },
  proximo_a_vencer: { style: "bg-amber-100 text-amber-700", label: "Próximo a vencer" },
  incumplido: { style: "bg-red-100 text-red-700", label: "Incumplido" },
  sin_sla: { style: "bg-gray-100 text-gray-500", label: "Sin SLA" },
};

export function SlaBadge({ state }: { state: SlaState }) {
  const { style, label } = SLA_STYLES[state] ?? SLA_STYLES.sin_sla;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

/**
 * Badge de clasificación del ticket (Incidente / Solicitud de servicio).
 * Usa borde en vez de relleno para distinguirlo a simple vista de los
 * badges de estado y prioridad que aparecen en la misma fila.
 */
const TYPE_STYLES: Record<TicketType, string> = {
  incident: "border-sira-dark/40 text-sira-dark",
  request: "border-sira-primary/50 text-sira-primary",
};

export function TypeBadge({ type, label }: { type: TicketType; label: string }) {
  const style = TYPE_STYLES[type] ?? "border-gray-300 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
