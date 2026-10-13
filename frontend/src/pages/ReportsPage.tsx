import { FileBarChart } from "lucide-react";

/**
 * Placeholder de reportes exportables. Las gráficas y KPIs completos
 * ya viven en el Dashboard (GET /api/dashboard/summary/); este
 * módulo se ampliará con exportación a PDF/Excel en una fase
 * posterior fuera del alcance académico inicial.
 */
export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sira-dark">Reportes</h1>
        <p className="text-sm text-gray-500">Reportes detallados de gestión de tickets y cumplimiento de SLA.</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-sira-soft/50 bg-white py-20 text-center shadow-sm">
        <FileBarChart className="h-10 w-10 text-sira-soft" />
        <p className="max-w-sm text-sm text-gray-500">
          Los indicadores y gráficos principales están disponibles en el Dashboard.
          La exportación de reportes en PDF/Excel se incorporará en una siguiente iteración.
        </p>
      </div>
    </div>
  );
}
