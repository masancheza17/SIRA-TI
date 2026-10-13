import { ClipboardList, Pencil, Plus, Power } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { Category, PaginatedResponse, SLA, Service, Technician } from "@/types";

const emptyForm = { name: "", description: "", category: "", responsible: "", schedule: "Lunes a viernes 8:00-18:00", sla: "" };

export default function ServicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Service | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    api.get<PaginatedResponse<Service>>("/services/").then((res) => {
      setServices(res.data.results ?? (res.data as unknown as Service[]));
      setStatus("ready");
    }).catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
    api.get("/tickets/categories/").then((r) => setCategories(r.data.results ?? r.data));
    api.get("/technicians/").then((r) => setTechnicians(r.data.results ?? r.data));
    api.get("/sla/").then((r) => setSlas(r.data.results ?? r.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name, description: service.description,
      category: service.category ? String(service.category) : "",
      responsible: service.responsible ? String(service.responsible) : "",
      schedule: service.schedule, sla: service.sla ? String(service.sla) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        category: form.category || null,
        responsible: form.responsible || null,
        sla: form.sla || null,
      };
      if (editing) {
        await api.patch(`/services/${editing.id}/`, payload);
      } else {
        await api.post("/services/", { ...payload, status: "active" });
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
      await api.patch(`/services/${confirmTarget.id}/`, { status: newStatus });
      setSuccessMessage(
        newStatus === "active"
          ? `Servicio "${confirmTarget.name}" activado correctamente.`
          : `Servicio "${confirmTarget.name}" desactivado correctamente.`
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
          <h1 className="text-xl font-semibold text-sira-dark">Catálogo de servicios</h1>
          <p className="text-sm text-gray-500">Servicios de TI ofrecidos, alineados a buenas prácticas ITIL.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark">
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </button>
        )}
      </div>

      {successMessage && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && services.length === 0 && <EmptyState icon={ClipboardList} message="No hay servicios registrados." />}
        {status === "ready" && services.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.category_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.responsible_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.sla_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                      {s.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmTarget(s)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Cambiar estado">
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
        <Modal title={editing ? "Editar servicio" : "Nuevo servicio"} onClose={() => setShowModal(false)}>
          <FormField label="Nombre" required>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Descripción">
            <textarea className={`${inputClass} min-h-[70px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label="Categoría">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Responsable">
            <select className={inputClass} value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })}>
              <option value="">Sin asignar</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormField>
          <FormField label="SLA">
            <select className={inputClass} value={form.sla} onChange={(e) => setForm({ ...form, sla: e.target.value })}>
              <option value="">Sin SLA</option>
              {slas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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
          title={confirmTarget.status === "active" ? "Desactivar servicio" : "Activar servicio"}
          message={
            confirmTarget.status === "active"
              ? "¿Desea desactivar este servicio? Esta acción cambiará su estado a inactivo."
              : "¿Desea activar este servicio? Esta acción cambiará su estado a activo."
          }
          detail={`Servicio: ${confirmTarget.name}`}
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
