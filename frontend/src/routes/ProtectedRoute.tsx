import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

/**
 * Protege rutas que requieren sesión iniciada y, opcionalmente,
 * un rol específico. Si el usuario no está autenticado, redirige a
 * /login conservando la ruta original para volver tras iniciar
 * sesión. Si está autenticado pero con un rol no permitido, lo
 * redirige a su propio dashboard en lugar de mostrar la página.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: Role[];
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Verificando sesión..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
