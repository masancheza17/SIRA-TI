import { Plus, Power, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, inputClass } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { AppUser, PaginatedResponse } from "@/types";

interface RoleOption { id: number; name: string; }

const emptyForm = {
  username: "", email: "", first_name: "", last_name: "", role: "", document: "", phone: "", password: "",
};

const ROLE_LABELS: Record<string, string> = { admin: "Administrador", technician: "Técnico", client: "Cliente" };

/** CRUD de usuarios del sistema. Solo accesible para Administradores. */
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AppUser | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    api.get<PaginatedResponse<AppUser>>("/users/").then((res) => {
      setUsers(res.data.results ?? (res.data as unknown as AppUser[]));
      setStatus("ready");
    }).catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
    // No hay endpoint dedicado de roles; se infieren de los usuarios existentes
    // o se pueden gestionar directamente desde /admin en esta fase inicial.
    setRoles([
      { id: 1, name: "admin" }, { id: 2, name: "technician" }, { id: 3, name: "client" },
    ]);
  }, []);

  const handleSubmit = async () => {
    setIsSaving(true);
    setFormError(null);
    try {
      await api.post("/users/", { ...form, role: form.role || null });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch {
      setFormError("No fue posible crear el usuario. Verifica que el nombre de usuario no esté en uso.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!confirmTarget) return;
    const newActive = !confirmTarget.is_active;
    setIsToggling(true);
    try {
      await api.patch(`/users/${confirmTarget.id}/`, { is_active: newActive });
      setSuccessMessage(
        newActive
          ? `Usuario "${confirmTarget.username}" activado correctamente.`
          : `Usuario "${confirmTarget.username}" desactivado correctamente.`
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
          <h1 className="text-xl font-semibold text-sira-dark">Usuarios</h1>
          <p className="text-sm text-gray-500">Cuentas de acceso al sistema y sus roles.</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {successMessage && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-sira-soft/50 bg-white shadow-sm">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState />}
        {status === "ready" && users.length === 0 && <EmptyState icon={UserCog} message="No hay usuarios registrados." />}
        {status === "ready" && users.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-sira-light/60 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sira-soft/30">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sira-light/30">
                  <td className="px-4 py-3 font-medium text-sira-dark">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{`${u.first_name} ${u.last_name}`.trim() || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.role_name ? ROLE_LABELS[u.role_name] : "Sin rol"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id === currentUser?.id ? (
                      <span className="text-xs text-gray-400" title="No puedes desactivar tu propia cuenta">
                        Tú
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmTarget(u)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-sira-light hover:text-sira-primary"
                        title={u.is_active ? "Desactivar" : "Activar"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title="Nuevo usuario" onClose={() => setShowModal(false)}>
          {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" required>
              <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </FormField>
            <FormField label="Apellido" required>
              <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Usuario" required>
            <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </FormField>
          <FormField label="Correo" required>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Rol" required>
            <select required className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">Selecciona un rol</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{ROLE_LABELS[r.name]}</option>)}
            </select>
          </FormField>
          <FormField label="Contraseña temporal" required>
            <input type="password" required className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
          title={confirmTarget.is_active ? "Desactivar usuario" : "Activar usuario"}
          message={
            confirmTarget.is_active
              ? "¿Desea desactivar este usuario? Esta acción cambiará su estado a inactivo y no podrá iniciar sesión."
              : "¿Desea activar este usuario? Esta acción cambiará su estado a activo."
          }
          detail={`Usuario: ${confirmTarget.username}`}
          confirmLabel={confirmTarget.is_active ? "Desactivar" : "Activar"}
          tone={confirmTarget.is_active ? "danger" : "default"}
          isLoading={isToggling}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
