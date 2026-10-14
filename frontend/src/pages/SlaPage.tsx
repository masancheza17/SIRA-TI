import { Pencil, Plus, Power, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { PaginatedResponse, Priority, SLA } from "@/types";

const emptyForm = {
  name: "", description: "", priority: "", max_response_time: "", max_resolution_time: "",
  schedule: "Lunes a viernes 8:00-18:00",
};

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${(min / 60).toFixed(1)} h`;
  return `${(min / 1440).toFixed(1)} días`;
}

export default function SlaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [slas, setSlas] = useState<SLA[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SLA | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<SLA | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    api.get<PaginatedResponse<SLA>>("/sla/").then((res) => {
      setSlas(res.data.results ?? (res.data as unknown as SLA[]));
      setStatus("ready");
    }).catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
    api.get("/tickets/priorities/").then((r) => setPriorities(r.data.results ?? r.data));
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (sla: SLA) => {
    setEditing(sla);
    setForm({
      name: sla.name, description: sla.description, priority: String(sla.priority),
      max_response_time: String(sla.max_response_time), max_resolution_time: String(sla.max_resolution_time),
      schedule: sla.schedule,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        max_response_time: Number(form.max_response_time),
        max_resolution_time: Number(form.max_resolution_time),
      };
      if (editing) {
        await api.patch(`/sla/${editing.id}/`, payload);
      } else {
        await api.post("/sla/", { ...payload, status: "active" });
      }
      setShowModal(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!confirmTarget) return;
    const newStatus = confirmTarget.status === "active" ? "inactive" : "active";
    setIsToggling(true);
    try {
      await api.patch(`/sla/${confirmTarget.id}/`, { status: newStatus });
      setSuccessMessage(
        newStatus === "active"
          ? `SLA "${confirmTarget.name}" activado correctamente.`
          : `SLA "${confirmTarget.name}" desactivado correctamente.`
      );
      setConfirmTarget(null);
      load();
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sira-dark">Acuerdos de Nivel de Servicio (SLA)</h1>
          <p className="text-sm text-gray-500">Tiempos máximos de respuesta y solución por prioridad.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark">
            <Plus className="h-4 w-4" />
            Nuevo SLA
          </button>
        )}
      </div>

      {successMessage && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && slas.length === 0 && <EmptyState icon={ShieldCheck} message="No hay SLA configurados." />}
        {status === "ready" && slas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Tiempo de respuesta</th>
                <th className="px-4 py-3">Tiempo de solución</th>
                <th className="px-4 py-3">Horario</th>
                <th className="px-4 py-3">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {slas.map((sla) => (
                <tr key={sla.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">{sla.name}</td>
                  <td className="px-4 py-3 text-gray-600">{sla.priority_detail?.name_display}</td>
                  <td className="px-4 py-3 text-gray-600">{formatMinutes(sla.max_response_time)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatMinutes(sla.max_resolution_time)}</td>
                  <td className="px-4 py-3 text-gray-600">{sla.schedule}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${sla.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                      {sla.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(sla)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmTarget(sla)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Cambiar estado">
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar SLA" : "Nuevo SLA"} onClose={() => setShowModal(false)}>
          <FormField label="Nombre" required>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Descripción">
            <textarea className={`${inputClass} min-h-[60px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label="Prioridad" required>
            <select required className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="">Selecciona una prioridad</option>
              {priorities.map((p) => <option key={p.id} value={p.id}>{p.name_display}</option>)}
            </select>
          </FormField>
          <FormField label="Tiempo máximo de respuesta (minutos)" required>
            <input type="number" min={1} required className={inputClass} value={form.max_response_time} onChange={(e) => setForm({ ...form, max_response_time: e.target.value })} />
          </FormField>
          <FormField label="Tiempo máximo de solución (minutos)" required>
            <input type="number" min={1} required className={inputClass} value={form.max_resolution_time} onChange={(e) => setForm({ ...form, max_resolution_time: e.target.value })} />
          </FormField>
          <FormField label="Horario">
            <input className={inputClass} value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          </FormField>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSubmit} disabled={isSaving} className="rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-60">
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.status === "active" ? "Desactivar SLA" : "Activar SLA"}
          message={
            confirmTarget.status === "active"
              ? "¿Desea desactivar este SLA? Esta acción cambiará su estado a inactivo."
              : "¿Desea activar este SLA? Esta acción cambiará su estado a activo."
          }
          detail={`SLA: ${confirmTarget.name}`}
          confirmLabel={confirmTarget.status === "active" ? "Desactivar" : "Activar"}
          tone={confirmTarget.status === "active" ? "danger" : "default"}
          isLoading={isToggling}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
