import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { inputClass } from "@/components/FormField";
import { AuthLayout } from "@/layouts/AuthLayout";
import api from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/password-reset/", { email });
      setSent(true);
    } catch {
      setError("No fue posible procesar la solicitud. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo registrado y te enviaremos instrucciones para restablecerla."
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
      {sent ? (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} pl-9`}
                placeholder="correo@empresa.com"
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-sira-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sira-dark disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar instrucciones
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
