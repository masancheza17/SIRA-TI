/**
 * Tipos TypeScript compartidos por todo el frontend de SIRA TI.
 * Reflejan la forma de los datos devueltos por la API (ver los
 * serializers de cada app en el backend).
 */

export type Role = "admin" | "technician" | "client";

/** Clasificación ITIL del ticket. */
export type TicketType = "request" | "incident";

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: number;
  user: number | null;
  name: string;
  document: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Technician {
  id: number;
  user: number | null;
  name: string;
  document: string;
  email: string;
  phone: string;
  specialty: string;
  status: "active" | "inactive";
  hire_date: string | null;
  open_tickets_count: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export type PriorityName = "low" | "medium" | "high" | "critical";

export interface Priority {
  id: number;
  name: PriorityName;
  name_display: string;
  level: number;
  color: string;
}

export type StatusName = "new" | "assigned" | "in_progress" | "on_hold" | "resolved" | "closed";

export interface TicketStatus {
  id: number;
  name: StatusName;
  name_display: string;
  order: number;
  is_closed: boolean;
}

export interface SLA {
  id: number;
  name: string;
  description: string;
  priority: number;
  priority_detail?: Priority;
  max_response_time: number;
  max_resolution_time: number;
  schedule: string;
  status: "active" | "inactive";
}

export interface Service {
  id: number;
  name: string;
  description: string;
  category: number | null;
  category_name: string | null;
  responsible: number | null;
  responsible_name: string | null;
  schedule: string;
  sla: number | null;
  sla_name: string | null;
  status: "active" | "inactive";
}

export type SlaState = "cumplido" | "proximo_a_vencer" | "incumplido" | "sin_sla";

export interface SlaCompliance {
  state: SlaState;
  elapsed_minutes: number | null;
  remaining_minutes: number | null;
}

export interface TicketListItem {
  id: number;
  subject: string;
  client: number;
  client_name: string;
  technician: number | null;
  technician_name: string | null;
  category: number | null;
  category_name: string | null;
  priority: number;
  priority_name: string;
  status: number;
  status_name: string;
  ticket_type: TicketType;
  ticket_type_name: string;
  created_at: string;
  sla_state: SlaState;
}

export interface Comment {
  id: number;
  ticket: number;
  author: number | null;
  author_name: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketHistoryEntry {
  id: number;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by_name: string | null;
  changed_at: string;
}

/** Imagen adjunta a un ticket (metadatos; el archivo se descarga por endpoint autenticado). */
export interface TicketAttachment {
  id: number;
  original_name: string;
  content_type: string;
  size: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface TicketDetail {
  id: number;
  subject: string;
  description: string;
  solution: string;
  client: number;
  client_name: string;
  created_by: number | null;
  technician: number | null;
  technician_name: string | null;
  category: number | null;
  category_name: string | null;
  priority: number;
  priority_name: string;
  service: number | null;
  service_name: string | null;
  status: number;
  status_name: string;
  sla: number | null;
  sla_name: string | null;
  sla_compliance: SlaCompliance;
  ticket_type: TicketType;
  ticket_type_name: string;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  response_time_minutes: number | null;
  resolution_time_minutes: number | null;
  attachments: TicketAttachment[];
  comments: Comment[];
  history: TicketHistoryEntry[];
}

export interface DashboardKpis {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  overdue_tickets: number;
  due_soon_tickets: number;
  sla_compliance_pct: number | null;
  avg_response_time_minutes: number | null;
  avg_resolution_time_minutes: number | null;
}

export interface DashboardCharts {
  tickets_by_status: { status__name: string; total: number }[];
  tickets_by_priority: { priority__name: string; total: number }[];
  tickets_by_category: { category__name: string; total: number }[];
  tickets_by_technician: { technician__name: string; total: number }[];
  tickets_by_type: { ticket_type: TicketType; total: number }[];
  tickets_created_over_time: { day: string; total: number }[];
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  charts: DashboardCharts;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AppUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: number | null;
  role_name: Role | null;
  document: string;
  phone: string;
  is_active: boolean;
  date_joined: string;
}
