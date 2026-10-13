import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

/**
 * Layout general de la aplicación autenticada: sidebar fijo a la
 * izquierda en escritorio (o panel deslizable en móvil), navbar
 * superior y el contenido de la página activa renderizado por React
 * Router en <Outlet />.
 *
 * El estado de apertura del menú móvil vive aquí (no dentro de
 * Sidebar) porque tanto el botón que lo abre (Navbar) como el panel
 * que lo muestra (Sidebar) son hermanos: este es el ancestro común
 * más simple para coordinarlos.
 */
export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-sira-light/40">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
