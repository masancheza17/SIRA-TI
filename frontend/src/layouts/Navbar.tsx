import { LogOut, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  technician: "Técnico",
  client: "Cliente",
};

const ROLE_BADGE_STYLES: Record<Role, string> = {
  admin: "bg-sira-dark/10 text-sira-dark",
  technician: "bg-sira-primary/15 text-sira-primary",
  client: "bg-sira-secondary/20 text-sira-secondary",
};

/**
 * Título visible en la barra superior según la ruta activa. Cubre
 * rutas fijas y usa un prefijo para las dinámicas (detalle de
 * ticket). Si una ruta no está mapeada, se usa un título genérico en
 * vez de dejar el encabezado vacío.
 */
const PAGE_TITLES: { match: (path: string) => boolean; title: string }[] = [
  { match: (p) => p === "/dashboard", title: "Dashboard" },
  { match: (p) => p === "/tickets/new", title: "Crear ticket" },
  { match: (p) => /^\/tickets\/\d+/.test(p), title: "Detalle de ticket" },
  { match: (p) => p === "/tickets", title: "Tickets" },
  { match: (p) => p === "/clients", title: "Clientes" },
  { match: (p) => p === "/technicians", title: "Técnicos" },
  { match: (p) => p === "/users", title: "Usuarios" },
  { match: (p) => p === "/services", title: "Catálogo de servicios" },
  { match: (p) => p === "/sla", title: "SLA" },
  { match: (p) => p === "/reports", title: "Reportes" },
  { match: (p) => p === "/history", title: "Historial" },
  { match: (p) => p === "/settings", title: "Configuración" },
];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find(({ match }) => match(pathname))?.title ?? "SIRA TI";
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-sira-soft/40 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-sira-dark hover:bg-sira-light/60 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-sira-dark sm:text-base">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sira-primary text-xs font-semibold text-white">
            {user ? getInitials(user.full_name) : "?"}
          </span>
          <div className="hidden sm:block">
            <p className="font-medium leading-tight text-sira-dark">{user?.full_name}</p>
            {user && (
              <span
                className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${ROLE_BADGE_STYLES[user.role]}`}
              >
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
