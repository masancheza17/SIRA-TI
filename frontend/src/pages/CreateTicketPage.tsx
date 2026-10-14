import { AlertCircle, ArrowLeft, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { FormField, inputClass } from "@/components/FormField";
import { ImagePicker } from "@/components/ImagePicker";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { Category, Client, PaginatedResponse, Priority, Service, TicketType } from "@/types";
import { extractUploadErrors, uploadTicketImages } from "@/utils/attachments";

/** Clasificación inicial del ticket; después un técnico o administrador puede corregirla. */
const TYPE_OPTIONS: { value: TicketType; label: string; description: string }[] = [
  { value: "incident", label: "Incidente", description: "Algo que funcionaba dejó de funcionar o falla." },
  { value: "request", label: "Solicitud de servicio", description: "Necesito algo nuevo: una instalación, un acceso, un usuario." },
];

/**
 * Formulario de creación de ticket.
 *
 * Cuando el usuario es Cliente, el backend ignora cualquier "client"
 * enviado y asigna automáticamente su propio perfil (ver
 * apps.tickets.views.TicketViewSet.perform_create), así que aquí no
 * se pide seleccionar cliente. Administrador y Técnico sí eligen el
 * cliente porque suelen registrar tickets reportados por teléfono.
 */
export default function CreateTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInternalUser = user?.role === "admin" || user?.role === "technician";

  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  const [form, setForm] = useState({
    client: "", category: "", service: "", priority: "medium", subject: "", description: "",
    ticket_type: "request" as TicketType,
  });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<PaginatedResponse<Category>>("/tickets/categories/").then((r) => setCategories(r.data.results ?? r.data as unknown as Category[]));
    api.get<PaginatedResponse<Priority>>("/tickets/priorities/").then((r) => setPriorities(r.data.results ?? r.data as unknown as Priority[]));
    api.get<PaginatedResponse<Service>>("/services/").then((r) => setServices(r.data.results ?? r.data as unknown as Service[]));
    if (isInternalUser) {
      api.get<PaginatedResponse<Client>>("/clients/", { params: { status: "active" } }).then((r) =>
        setClients(r.data.results ?? (r.data as unknown as Client[]))
      );
    }
  }, [isInternalUser]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/tickets/", {
        client: form.client || undefined,
        category: form.category || null,
        service: form.service || null,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        ticket_type: form.ticket_type,
      });

      if (images.length > 0) {
        try {
          await uploadTicketImages(data.id, images);
        } catch (uploadError) {
          // El ticket ya existe: se lleva al usuario a su detalle, avisando que
          // las imágenes no se subieron, desde donde puede volver a intentarlo.
          navigate(`/tickets/${data.id}`, { state: { attachmentErrors: extractUploadErrors(uploadError) } });
          return;
        }
      }
      navigate(`/tickets/${data.id}`);
    } catch {
      setError("No fue posible crear el ticket. Revisa los campos obligatorios.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-sira-primary">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div>
        <h1 className="text-xl font-semibold text-sira-dark">Crear ticket</h1>
        <p className="text-sm text-gray-500">
          Describe el problema o la solicitud con el mayor detalle posible.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-sira-soft/50 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isInternalUser && (
          <FormField label="Cliente" required>
            <select required className={inputClass} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Tipo de ticket" required>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-sira-primary ${
                  form.ticket_type === option.value
                    ? "border-sira-primary bg-sira-primary/5"
                    : "border-gray-300 hover:border-sira-soft"
                }`}
              >
                <input
                  type="radio"
                  name="ticket_type"
                  value={option.value}
                  checked={form.ticket_type === option.value}
                  onChange={() => setForm({ ...form, ticket_type: option.value })}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-sira-dark">{option.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{option.description}</span>
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Asunto" required>
          <input
            required
            className={inputClass}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Resumen breve del problema"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Categoría">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Prioridad" required>
            <select required className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {priorities.map((p) => (
                <option key={p.id} value={p.name}>{p.name_display}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Servicio relacionado">
          <select className={inputClass} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
            <option value="">Sin especificar</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Descripción" required>
          <textarea
            required
            className={`${inputClass} min-h-[120px]`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe el problema con el mayor detalle posible: cuándo ocurrió, qué mensajes de error aparecen, qué intentaste..."
          />
        </FormField>

        <FormField label="Imágenes de evidencia (opcional)">
          <ImagePicker files={images} onChange={setImages} disabled={isSubmitting} />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-sira-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-sira-dark disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {isSubmitting
            ? images.length > 0 ? "Creando ticket y subiendo imágenes..." : "Creando ticket..."
            : "Crear ticket"}
        </button>
      </form>
    </div>
  );
}
