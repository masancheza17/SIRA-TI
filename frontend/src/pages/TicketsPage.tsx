import { Plus, Search, Ticket as TicketIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { PriorityBadge, SlaBadge, StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { PaginatedResponse, TicketListItem, TicketStatus } from "@/types";

/**
 * Listado de tickets. El backend ya filtra por rol (un técnico solo
 * ve sus tickets asignados, un cliente solo los suyos), así que esta
 * página se reutiliza para los tres roles sin lógica adicional.
 */
export default function TicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    api.get<PaginatedResponse<TicketStatus> | TicketStatus[]>("/tickets/statuses/").then((res) => {
      const data = res.data as PaginatedResponse<TicketStatus> | TicketStatus[];
      setStatuses("results" in data ? data.results : data);
    });
  }, []);

  const load = () => {
    setStatus("loading");
    api
      .get<PaginatedResponse<TicketListItem>>("/tickets/", {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          ticket_type: typeFilter || undefined,
        },
      })
      .then((res) => {
        setTickets(res.data.results ?? (res.data as unknown as TicketListItem[]));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sira-dark">
            {user?.role === "client" ? "Mis tickets" : "Tickets"}
          </h1>
          <p className="text-sm text-gray-500">Gestión de solicitudes de servicio e incidentes.</p>
        </div>
        {user?.role !== "technician" && (
          <button
            onClick={() => navigate("/tickets/new")}
            className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark"
          >
            <Plus className="h-4 w-4" />
            Nuevo ticket
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por asunto o descripción..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name_display}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">Todos los tipos</option>
          <option value="incident">Incidente</option>
          <option value="request">Solicitud de servicio</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && tickets.length === 0 && (
          <EmptyState icon={TicketIcon} message="No hay tickets registrados." />
        )}
        {status === "ready" && tickets.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-sira-light/30"
                >
                  <td className="px-4 py-3 font-medium text-sira-dark">
                    <Link to={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                      #{ticket.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={ticket.ticket_type} label={ticket.ticket_type_name} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ticket.client_name}</td>
                  <td className="px-4 py-3 text-gray-600">{ticket.technician_name ?? "Sin asignar"}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={String(ticket.priority)} label={ticket.priority_name} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={statuses.find((s) => s.id === ticket.status)?.name ?? ""} label={ticket.status_name} />
                  </td>
                  <td className="px-4 py-3">
                    <SlaBadge state={ticket.sla_state} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(ticket.created_at).toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
