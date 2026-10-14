import { Pencil, Plus, Power, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { Client, PaginatedResponse } from "@/types";

const emptyForm = {
  name: "", document: "", company: "", email: "", phone: "", address: "",
};

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Client | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadClients = () => {
    setStatus("loading");
    api
      .get<PaginatedResponse<Client>>("/clients/", { params: { search: search || undefined } })
      .then((res) => {
        setClients(res.data.results ?? (res.data as unknown as Client[]));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    const timeout = setTimeout(loadClients, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name, document: client.document, company: client.company,
      email: client.email, phone: client.phone, address: client.address,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/clients/${editing.id}/`, form);
      } else {
        await api.post("/clients/", { ...form, status: "active" });
      }
      setShowModal(false);
      loadClients();
    } catch (err: unknown) {
      const detail = extractError(err);
      setFormError(detail ?? "No fue posible guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!confirmTarget) return;
    const newStatus = confirmTarget.status === "active" ? "inactive" : "active";
    setIsToggling(true);
    try {
      await api.patch(`/clients/${confirmTarget.id}/`, { status: newStatus });
      setSuccessMessage(
        newStatus === "active"
          ? `Cliente "${confirmTarget.name}" activado correctamente.`
          : `Cliente "${confirmTarget.name}" desactivado correctamente.`
      );
      setConfirmTarget(null);
      loadClients();
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsToggling(false);
    }
  };

  const filtered = useMemo(() => clients, [clients]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sira-dark">Clientes</h1>
          <p className="text-sm text-gray-500">Empresas y personas que solicitan soporte técnico.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark"
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
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
          placeholder="Buscar por nombre, empresa, documento..."
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && filtered.length === 0 && (
          <EmptyState icon={Users} message="No hay clientes registrados." />
        )}
        {status === "ready" && filtered.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.company || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{client.document}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email}</td>
                  <td className="px-4 py-3 text-gray-600">{client.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        client.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {client.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmTarget(client)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary"
                          title={client.status === "active" ? "Desactivar" : "Activar"}
                        >
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
        <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={() => setShowModal(false)}>
          {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}
          <FormField label="Nombre" required>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Documento" required>
            <input className={inputClass} value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          </FormField>
          <FormField label="Empresa">
            <input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </FormField>
          <FormField label="Correo" required>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Teléfono">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Dirección">
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormField>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.status === "active" ? "Desactivar cliente" : "Activar cliente"}
          message={
            confirmTarget.status === "active"
              ? "¿Desea desactivar este cliente? Esta acción cambiará su estado a inactivo."
              : "¿Desea activar este cliente? Esta acción cambiará su estado a activo."
          }
          detail={`Cliente: ${confirmTarget.name}`}
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

function extractError(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { data?: Record<string, unknown> } }).response;
    const data = response?.data;
    if (data) {
      const firstKey = Object.keys(data)[0];
      const value = data[firstKey];
      if (Array.isArray(value)) return String(value[0]);
      if (typeof value === "string") return value;
    }
  }
  return null;
}
