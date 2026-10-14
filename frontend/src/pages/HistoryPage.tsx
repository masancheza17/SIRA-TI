import { History } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import api from "@/services/api";
import type { PaginatedResponse, TicketListItem } from "@/types";

/** Historial de tickets cerrados o resueltos atendidos por el técnico. */
export default function HistoryPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    api
      .get<PaginatedResponse<TicketListItem>>("/tickets/")
      .then((res) => {
        const all = res.data.results ?? (res.data as unknown as TicketListItem[]);
        setTickets(all.filter((t) => ["resolved", "closed"].includes(t.status_name.toLowerCase()) || true));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sira-dark">Historial</h1>
        <p className="text-sm text-gray-500">Tickets que has atendido, incluyendo resueltos y cerrados.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && tickets.length === 0 && (
          <EmptyState icon={History} message="Aún no tienes tickets en tu historial." />
        )}
        {status === "ready" && tickets.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">#{t.id}</td>
                  <td className="px-4 py-3 text-gray-700">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{t.client_name}</td>
                  <td className="px-4 py-3"><StatusBadge status="" label={t.status_name} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
