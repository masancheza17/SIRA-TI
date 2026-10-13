import {
  BarChart3,
  ClipboardList,
  FilePlus2,
  History,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Ticket,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

interface MenuItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

/**
 * Menú lateral por rol, agrupado en secciones ("Principal", "Gestión",
 * "Soporte", etc.). Agrupar en vez de listar todo en un solo bloque
 * ayuda a que cada portal (Administrador / Técnico / Cliente) se lea
 * como un espacio de trabajo distinto y no como una única pantalla a
 * la que simplemente se le ocultan o muestran ítems.
 *
 * La autorización real (qué puede ver/hacer cada rol) siempre se
 * valida en el backend; este menú solo refleja esa autorización en
 * la UI para comodidad de navegación.
 */
const MENUS: Record<Role, MenuGroup[]> = {
  admin: [
    { label: "Principal", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Gestión",
      items: [
        { to: "/clients", label: "Clientes", icon: Users },
        { to: "/technicians", label: "Técnicos", icon: Wrench },
        { to: "/users", label: "Usuarios", icon: UserCog },
      ],
    },
    {
      label: "Soporte",
      items: [
        { to: "/tickets", label: "Tickets", icon: Ticket },
        { to: "/services", label: "Catálogo de servicios", icon: ClipboardList },
        { to: "/sla", label: "SLA", icon: ShieldCheck },
      ],
    },
    {
      label: "Análisis",
      items: [{ to: "/reports", label: "Reportes", icon: BarChart3 }],
    },
    {
      label: "Sistema",
      items: [{ to: "/settings", label: "Configuración", icon: Settings }],
    },
  ],
  technician: [
    { label: "Principal", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Soporte",
      items: [
        { to: "/tickets", label: "Mis tickets", icon: Ticket },
        { to: "/clients", label: "Clientes asignados", icon: Users },
        { to: "/history", label: "Historial", icon: History },
      ],
    },
    {
      label: "Sistema",
      items: [{ to: "/settings", label: "Configuración", icon: Settings }],
    },
  ],
  client: [
    { label: "Principal", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Soporte",
      items: [
        { to: "/tickets/new", label: "Crear ticket", icon: FilePlus2 },
        { to: "/tickets", label: "Mis tickets", icon: ListChecks },
      ],
    },
    {
      label: "Sistema",
      items: [{ to: "/settings", label: "Perfil", icon: Settings }],
    },
  ],
};

const PORTAL_LABELS: Record<Role, string> = {
  admin: "Portal Administrador",
  technician: "Portal Técnico",
  client: "Portal Cliente",
};

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const groups = MENUS[user.role];

  const content = (
    <div className="flex h-full flex-col bg-sira-dark text-white">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
        <Logo theme="light" size="sm" />
        <button
          onClick={onClose}
          className="rounded-md p-1 text-sira-soft hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pt-4">
        <span className="inline-flex rounded-full bg-sira-primary/20 px-3 py-1 text-[11px] font-medium tracking-wide text-sira-secondary">
          {PORTAL_LABELS[user.role]}
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sira-soft/50">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sira-primary/15 text-white"
                        : "text-sira-soft hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sira-secondary transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-sira-soft/70">
        SIRA TI &copy; {new Date().getFullYear()}
      </div>
    </div>
  );

  return (
    <>
      {/* Escritorio: columna fija */}
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      {/* Móvil: overlay + panel deslizable, controlado por DashboardLayout */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-sira-dark/60 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[80%] shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
}
