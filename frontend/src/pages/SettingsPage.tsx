import { CheckCircle2, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormField, inputClass } from "@/components/FormField";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";

const ROLE_LABELS: Record<string, string> = { admin: "Administrador", technician: "Técnico", client: "Cliente" };

export default function SettingsPage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      await api.post("/users/change_password/", { old_password: oldPassword, new_password: newPassword });
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
    } catch {
      setError("No fue posible actualizar la contraseña. Verifica tu contraseña actual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-sira-dark">Configuración</h1>
        <p className="text-sm text-gray-500">Datos de tu cuenta y preferencias de seguridad.</p>
      </div>

      <div className="rounded-lg border border-sira-soft/50 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-sira-dark">Perfil</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-sira-soft/30 pb-2">
            <dt className="text-gray-500">Nombre</dt>
            <dd className="font-medium text-sira-dark">{user?.full_name}</dd>
          </div>
          <div className="flex justify-between border-b border-sira-soft/30 pb-2">
            <dt className="text-gray-500">Correo</dt>
            <dd className="font-medium text-sira-dark">{user?.email}</dd>
          </div>
          <div className="flex justify-between pb-1">
            <dt className="text-gray-500">Rol</dt>
            <dd className="font-medium text-sira-dark">{user ? ROLE_LABELS[user.role] : ""}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-sira-soft/50 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sira-dark">
          <KeyRound className="h-4 w-4 text-sira-primary" />
          Cambiar contraseña
        </h2>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {success && (
          <p className="mb-3 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Contraseña actualizada correctamente.
          </p>
        )}

        <FormField label="Contraseña actual" required>
          <input type="password" required className={inputClass} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </FormField>
        <FormField label="Nueva contraseña" required>
          <input type="password" required className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-60"
        >
          {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
