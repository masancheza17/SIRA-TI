import {
  AlarmClock,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Timer,
  Ticket as TicketIcon,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { DashboardSummary } from "@/types";

const CHART_COLORS = ["#031926", "#468189", "#77ACA2", "#9DBEBB", "#F4A259", "#D64545"];

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  assigned: "Asignado",
  in_progress: "En proceso",
  on_hold: "En espera",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const TYPE_LABELS: Record<string, string> = {
  incident: "Incidente",
  request: "Solicitud de servicio",
};

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "N/D";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} días`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let active = true;
    api
      .get<DashboardSummary>("/dashboard/summary/")
      .then((res) => {
        if (active) {
          setData(res.data);
          setStatus("ready");
        }
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <WelcomeBanner user={user} />
        <LoadingState message="Cargando indicadores..." />
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="space-y-6">
        <WelcomeBanner user={user} />
        <ErrorState message="No fue posible cargar el dashboard." />
      </div>
    );
  }

  const { kpis, charts } = data;

  const statusChartData = charts.tickets_by_status.map((item) => ({
    name: STATUS_LABELS[item.status__name] ?? item.status__name,
    total: item.total,
  }));
  const priorityChartData = charts.tickets_by_priority.map((item) => ({
    name: PRIORITY_LABELS[item.priority__name] ?? item.priority__name,
    total: item.total,
  }));
  const categoryChartData = charts.tickets_by_category.map((item) => ({
    name: item.category__name,
    total: item.total,
  }));
  const technicianChartData = charts.tickets_by_technician.map((item) => ({
    name: item.technician__name,
    total: item.total,
  }));
  const typeChartData = charts.tickets_by_type.map((item) => ({
    name: TYPE_LABELS[item.ticket_type] ?? item.ticket_type,
    total: item.total,
  }));
  const timeSeriesData = charts.tickets_created_over_time.map((item) => ({
    day: item.day.slice(5),
    total: item.total,
  }));

  return (
    <div className="space-y-6">
      <WelcomeBanner user={user} />

      {/* KPIs principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de tickets" value={kpis.total_tickets} icon={TicketIcon} />
        <StatCard label="Tickets abiertos" value={kpis.open_tickets} icon={Layers} />
        <StatCard label="En proceso" value={kpis.in_progress_tickets} icon={Clock} tone="default" />
        <StatCard label="Resueltos" value={kpis.resolved_tickets} icon={CheckCircle2} tone="success" />
        <StatCard label="Cerrados" value={kpis.closed_tickets} icon={XCircle} />
        <StatCard label="Vencidos (SLA)" value={kpis.overdue_tickets} icon={AlarmClock} tone="danger" />
        <StatCard label="Próximos a vencer" value={kpis.due_soon_tickets} icon={Timer} tone="warning" />
        <StatCard
          label="Cumplimiento SLA"
          value={kpis.sla_compliance_pct !== null ? `${kpis.sla_compliance_pct}%` : "N/D"}
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Tiempo promedio de respuesta"
          value={formatMinutes(kpis.avg_response_time_minutes)}
          icon={Clock}
        />
        <StatCard
          label="Tiempo promedio de solución"
          value={formatMinutes(kpis.avg_resolution_time_minutes)}
          icon={Timer}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Tickets por estado">
          {statusChartData.length === 0 ? (
            <EmptyState icon={TicketIcon} message="No hay tickets registrados." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusChartData} dataKey="total" nameKey="name" outerRadius={90} label>
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tickets por prioridad">
          {priorityChartData.length === 0 ? (
            <EmptyState icon={TicketIcon} message="No hay tickets registrados." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9DBEBB33" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#468189" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tickets por categoría">
          {categoryChartData.length === 0 ? (
            <EmptyState icon={Layers} message="No hay tickets categorizados aún." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#9DBEBB33" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#77ACA2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tickets por técnico">
          {technicianChartData.length === 0 ? (
            <EmptyState icon={Layers} message="No hay tickets asignados aún." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={technicianChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#9DBEBB33" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#031926" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Incidentes vs. solicitudes de servicio" full>
          {typeChartData.length === 0 ? (
            <EmptyState icon={Layers} message="No hay tickets clasificados aún." />
          ) : (
            <ResponsiveContainer width="100%" height={typeChartData.length * 60 + 40}>
              <BarChart data={typeChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#9DBEBB33" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#468189" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tickets creados (últimos 30 días)" full>
          {timeSeriesData.length === 0 ? (
            <EmptyState icon={Layers} message="No hay tickets creados en los últimos 30 días." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9DBEBB33" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#468189" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  full,
}: {
  title: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-sira-soft/50 bg-white p-5 shadow-sm ${full ? "lg:col-span-2" : ""}`}>
      <h2 className="mb-3 text-sm font-semibold text-sira-dark">{title}</h2>
      {children}
    </div>
  );
}
