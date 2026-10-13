import {
  ArrowLeft,
  Clock,
  History,
  Images,
  MessageSquare,
  Send,
  ShieldCheck,
  Tag,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { AttachmentGallery } from "@/components/AttachmentGallery";
import { ErrorState } from "@/components/ErrorState";
import { inputClass } from "@/components/FormField";
import { ImagePicker } from "@/components/ImagePicker";
import { LoadingState } from "@/components/LoadingState";
import { PriorityBadge, SlaBadge, StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import type { Priority, Technician, TicketDetail, TicketStatus, TicketType } from "@/types";
import { ATTACHMENT_RULES, extractUploadErrors, uploadTicketImages } from "@/utils/attachments";

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "technician";

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [solution, setSolution] = useState("");

  // Imágenes adjuntas. Si el ticket se acaba de crear y la subida falló, la
  // pantalla de creación pasa los errores por el estado de navegación.
  const initialAttachmentErrors = (location.state as { attachmentErrors?: string[] } | null)?.attachmentErrors ?? [];
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>(initialAttachmentErrors);
  const [showAddImages, setShowAddImages] = useState(initialAttachmentErrors.length > 0);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const load = () => {
    setStatus("loading");
    api
      .get<TicketDetail>(`/tickets/${id}/`)
      .then((res) => {
        setTicket(res.data);
        setSolution(res.data.solution ?? "");
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    if (initialAttachmentErrors.length > 0) {
      navigate(location.pathname, { replace: true, state: null });
    }
    load();
    api.get("/tickets/statuses/").then((res) => setStatuses(res.data.results ?? res.data));
    api.get("/tickets/priorities/").then((res) => setPriorities(res.data.results ?? res.data));
    if (canManage) {
      api.get("/technicians/", { params: { status: "active" } }).then((res) =>
        setTechnicians(res.data.results ?? res.data)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAssign = async (technicianId: string) => {
    if (!technicianId) return;
    await api.post(`/tickets/${id}/assign/`, { technician: technicianId });
    load();
  };

  const handleStatusChange = async (statusName: string) => {
    await api.post(`/tickets/${id}/change_status/`, { status: statusName });
    load();
  };

  const handlePriorityChange = async (priorityName: string) => {
    await api.post(`/tickets/${id}/change_priority/`, { priority: priorityName });
    load();
  };

  const handleTypeChange = async (ticketType: TicketType) => {
    await api.post(`/tickets/${id}/change_type/`, { ticket_type: ticketType });
    load();
  };

  const handleUploadImages = async () => {
    setAttachmentErrors([]);
    setIsUploadingImages(true);
    try {
      await uploadTicketImages(id!, newImages);
      setNewImages([]);
      setShowAddImages(false);
      load();
    } catch (error) {
      setAttachmentErrors(extractUploadErrors(error));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.post(`/tickets/${id}/comments/`, { content: comment, is_internal: isInternal });
      setComment("");
      setIsInternal(false);
      load();
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleClose = async () => {
    await api.post(`/tickets/${id}/close/`, { solution });
    load();
  };

  if (status === "loading") return <LoadingState message="Cargando ticket..." />;
  if (status === "error" || !ticket) return <ErrorState message="No fue posible cargar el ticket." />;

  const statusObj = statuses.find((s) => s.name === ticket.status_name || s.id === ticket.status);
  // El backend solo bloquea agregar imágenes cuando el ticket está cerrado.
  const remainingImageSlots = ATTACHMENT_RULES.maxFiles - ticket.attachments.length;
  const canAddImages = statusObj?.name !== "closed" && remainingImageSlots > 0;
  const visibleComments = ticket.comments.filter((c) => !c.is_internal || canManage);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-sira-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sira-dark">
            #{ticket.id} — {ticket.subject}
          </h1>
          <p className="text-sm text-gray-500">
            Cliente: {ticket.client_name} · Creado el {new Date(ticket.created_at).toLocaleString("es-CO")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeBadge type={ticket.ticket_type} label={ticket.ticket_type_name} />
          <PriorityBadge priority="" label={ticket.priority_name} />
          <StatusBadge status={statusObj?.name ?? ""} label={ticket.status_name} />
          <SlaBadge state={ticket.sla_compliance.state} />
        </div>
      </div>

      {attachmentErrors.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">No se pudieron subir las imágenes</p>
            <button onClick={() => setAttachmentErrors([])} className="text-xs text-amber-700 hover:underline">
              Cerrar
            </button>
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {attachmentErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Puedes volver a intentarlo desde la sección "Imágenes adjuntas".</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Descripción">
            <p className="whitespace-pre-line text-sm text-gray-700">{ticket.description}</p>
          </Card>

          {(ticket.attachments.length > 0 || canAddImages) && (
            <Card title={`Imágenes adjuntas (${ticket.attachments.length})`} icon={Images}>
              {ticket.attachments.length > 0 ? (
                <AttachmentGallery ticketId={ticket.id} attachments={ticket.attachments} />
              ) : (
                <p className="text-sm text-gray-500">Este ticket no tiene imágenes adjuntas.</p>
              )}

              {canAddImages && !showAddImages && (
                <button
                  onClick={() => setShowAddImages(true)}
                  className="mt-4 rounded-md border border-sira-primary px-3 py-1.5 text-sm font-medium text-sira-primary hover:bg-sira-primary/5"
                >
                  Agregar imágenes
                </button>
              )}

              {canAddImages && showAddImages && (
                <div className="mt-4 border-t border-sira-soft/40 pt-4">
                  <ImagePicker
                    files={newImages}
                    onChange={setNewImages}
                    maxFiles={remainingImageSlots}
                    disabled={isUploadingImages}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleUploadImages}
                      disabled={newImages.length === 0 || isUploadingImages}
                      className="rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-60"
                    >
                      {isUploadingImages
                        ? "Subiendo..."
                        : newImages.length === 0
                          ? "Subir imágenes"
                          : `Subir ${newImages.length} ${newImages.length === 1 ? "imagen" : "imágenes"}`}
                    </button>
                    <button
                      onClick={() => { setShowAddImages(false); setNewImages([]); }}
                      disabled={isUploadingImages}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {canManage && (
            <Card title="Solución">
              <textarea
                className={`${inputClass} min-h-[80px]`}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Describe la solución aplicada..."
              />
              {!statusObj?.is_closed && (
                <button
                  onClick={handleClose}
                  className="mt-3 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark"
                >
                  Registrar solución y cerrar ticket
                </button>
              )}
            </Card>
          )}

          <Card title="Comentarios" icon={MessageSquare}>
            <div className="mb-4 space-y-3">
              {visibleComments.length === 0 && (
                <p className="text-sm text-gray-400">Aún no hay comentarios.</p>
              )}
              {visibleComments.map((c) => (
                <div key={c.id} className="rounded-md border border-sira-soft/40 bg-sira-light/20 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-sira-dark">{c.author_name ?? "Usuario"}</span>
                    <span>{new Date(c.created_at).toLocaleString("es-CO")}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                  {c.is_internal && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Nota interna
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <textarea
                className={`${inputClass} min-h-[70px]`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe un comentario de seguimiento..."
              />
              <div className="flex items-center justify-between">
                {canManage && (
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    Nota interna (no visible para el cliente)
                  </label>
                )}
                <button
                  onClick={handleAddComment}
                  disabled={isSubmittingComment || !comment.trim()}
                  className="ml-auto flex items-center gap-2 rounded-md bg-sira-primary px-4 py-2 text-sm font-medium text-white hover:bg-sira-dark disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Comentar
                </button>
              </div>
            </div>
          </Card>

          <Card title="Historial" icon={History}>
            <ol className="space-y-3 border-l border-sira-soft/50 pl-4">
              {ticket.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-sira-dark">{h.changed_by_name ?? "Sistema"}</span>{" "}
                    cambió <span className="font-medium">{fieldLabel(h.field_changed)}</span>{" "}
                    de <span className="text-gray-500">{h.old_value || "—"}</span> a{" "}
                    <span className="text-gray-500">{h.new_value || "—"}</span>
                  </p>
                  <p className="text-xs text-gray-400">{new Date(h.changed_at).toLocaleString("es-CO")}</p>
                </li>
              ))}
              {ticket.history.length === 0 && <p className="text-sm text-gray-400">Sin cambios registrados.</p>}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Detalles">
            <dl className="space-y-3 text-sm">
              <Row label="Categoría" value={ticket.category_name ?? "Sin categoría"} />
              <Row label="Servicio" value={ticket.service_name ?? "Sin servicio"} />
              <Row label="SLA" value={ticket.sla_name ?? "Sin SLA"} />
              <Row label="Técnico" value={ticket.technician_name ?? "Sin asignar"} />
              <Row label="Tiempo de respuesta" value={formatMinutes(ticket.response_time_minutes)} />
              <Row label="Tiempo de solución" value={formatMinutes(ticket.resolution_time_minutes)} />
            </dl>
          </Card>

          {canManage && (
            <Card title="Gestión" icon={Wrench}>
              <FieldLabel icon={User} label="Asignar técnico" />
              <select
                className={inputClass}
                defaultValue={ticket.technician ?? ""}
                onChange={(e) => handleAssign(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <FieldLabel icon={Clock} label="Estado" className="mt-4" />
              <select
                className={inputClass}
                value={statusObj?.name ?? ""}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>{s.name_display}</option>
                ))}
              </select>

              <FieldLabel icon={ShieldCheck} label="Prioridad" className="mt-4" />
              <select
                className={inputClass}
                defaultValue={priorities.find((p) => p.name_display === ticket.priority_name)?.name ?? ""}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.name}>{p.name_display}</option>
                ))}
              </select>

              <FieldLabel icon={Tag} label="Clasificación" className="mt-4" />
              <select
                className={inputClass}
                value={ticket.ticket_type}
                onChange={(e) => handleTypeChange(e.target.value as TicketType)}
              >
                <option value="incident">Incidente</option>
                <option value="request">Solicitud de servicio</option>
              </select>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({
  title, children, icon: Icon,
}: { title: string; children: ReactNode; icon?: typeof MessageSquare }) {
  return (
    <div className="rounded-lg border border-sira-soft/50 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sira-dark">
        {Icon && <Icon className="h-4 w-4 text-sira-primary" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-sira-soft/30 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-sira-dark">{value}</dd>
    </div>
  );
}

function FieldLabel({
  icon: Icon, label, className = "",
}: { icon: typeof User; label: string; className?: string }) {
  return (
    <label className={`mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </label>
  );
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "N/D";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    status: "el estado", priority: "la prioridad", technician: "el técnico asignado",
    ticket_type: "la clasificación",
  };
  return labels[field] ?? field;
}
