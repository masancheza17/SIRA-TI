import { Pencil, Plus, Power, Search, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { PaginatedResponse, Technician } from "@/types";

const emptyForm = { name: "", document: "", email: "", phone: "", specialty: "", hire_date: "" };

export default function TechniciansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Technician | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Technician | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    api
      .get<PaginatedResponse<Technician>>("/technicians/", { params: { search: search || undefined } })
      .then((res) => {
        setTechnicians(res.data.results ?? (res.data as unknown as Technician[]));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (tech: Technician) => {
    setEditing(tech);
    setForm({
      name: tech.name, document: tech.document, email: tech.email,
      phone: tech.phone, specialty: tech.specialty, hire_date: tech.hire_date ?? "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, hire_date: form.hire_date || null };
      if (editing) {
        await api.patch(`/technicians/${editing.id}/`, payload);
      } else {
        await api.post("/technicians/", { ...payload, status: "active" });
      }
      setShowModal(false);
      load();
    } catch {
      setFormError("No fue posible guardar el técnico. Verifica los datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!confirmTarget) return;
    const newStatus = confirmTarget.status === "active" ? "inactive" : "active";
    setIsToggling(true);
    try {
      await api.patch(`/technicians/${confirmTarget.id}/`, { status: newStatus });
      setSuccessMessage(
        newStatus === "active"
          ? `Técnico "${confirmTarget.name}" activado correctamente.`
          : `Técnico "${confirmTarget.name}" desactivado correctamente.`
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
          <h1 className="text-xl font-semibold text-sira-dark">Técnicos</h1>
          <p className="text-sm text-gray-500">Personal de soporte técnico y sus especialidades.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark"
          >
            <Plus className="h-4 w-4" />
            Nuevo técnico
          </button>
        )}
      </div>

      {successMessage && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, especialidad..."
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && technicians.length === 0 && (
          <EmptyState icon={Wrench} message="No hay técnicos registrados." />
        )}
        {status === "ready" && technicians.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Especialidad</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Tickets abiertos</th>
                <th className="px-4 py-3">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {technicians.map((tech) => (
                <tr key={tech.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">{tech.name}</td>
                  <td className="px-4 py-3 text-gray-600">{tech.specialty || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{tech.email}</td>
                  <td className="px-4 py-3 text-gray-600">{tech.open_tickets_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        tech.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tech.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(tech)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmTarget(tech)} className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary" title="Cambiar estado">
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
        <Modal title={editing ? "Editar técnico" : "Nuevo técnico"} onClose={() => setShowModal(false)}>
          {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}
          <FormField label="Nombre" required>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Documento" required>
            <input className={inputClass} value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          </FormField>
          <FormField label="Correo" required>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Teléfono">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Especialidad">
            <input className={inputClass} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          </FormField>
          <FormField label="Fecha de ingreso">
            <input type="date" className={inputClass} value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          </FormField>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isSaving} className="rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-60">
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.status === "active" ? "Desactivar técnico" : "Activar técnico"}
          message={
            confirmTarget.status === "active"
              ? "¿Desea desactivar este técnico? Esta acción cambiará su estado a inactivo."
              : "¿Desea activar este técnico? Esta acción cambiará su estado a activo."
          }
          detail={`Técnico: ${confirmTarget.name}`}
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
