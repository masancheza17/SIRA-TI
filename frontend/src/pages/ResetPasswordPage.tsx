import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { FormField, inputClass } from "@/components/FormField";
import { AuthLayout } from "@/layouts/AuthLayout";
import api from "@/services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/password-reset/confirm/", { uid, token, new_password: newPassword });
      setSuccess(true);
    } catch {
      setError("El enlace no es válido o expiró. Solicita uno nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Restablecer contraseña"
      subtitle="Ingresa tu nueva contraseña para continuar."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-sira-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio de sesión
        </Link>
      }
    >
      {success ? (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <FormField label="Nueva contraseña" required>
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </FormField>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-sira-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sira-dark disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Restablecer contraseña
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
