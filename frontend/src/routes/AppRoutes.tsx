import { Navigate, Route, Routes } from "react-router-dom";

import { DashboardLayout } from "@/layouts/DashboardLayout";
import ClientsPage from "@/pages/ClientsPage";
import CreateTicketPage from "@/pages/CreateTicketPage";
import DashboardPage from "@/pages/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HistoryPage from "@/pages/HistoryPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ReportsPage from "@/pages/ReportsPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ServicesPage from "@/pages/ServicesPage";
import SettingsPage from "@/pages/SettingsPage";
import SlaPage from "@/pages/SlaPage";
import TechniciansPage from "@/pages/TechniciansPage";
import TicketDetailPage from "@/pages/TicketDetailPage";
import TicketsPage from "@/pages/TicketsPage";
import UsersPage from "@/pages/UsersPage";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Árbol de rutas de SIRA TI.
 *
 * Las rutas públicas (login, recuperación de contraseña) viven fuera
 * del layout autenticado. Todo lo demás se renderiza dentro de
 * DashboardLayout (sidebar + navbar) y pasa por ProtectedRoute, que
 * exige sesión iniciada y, cuando aplica, un rol específico.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/new" element={<CreateTicketPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/sla" element={<SlaPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={["admin", "technician"]}>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technicians"
          element={
            <ProtectedRoute allowedRoles={["admin", "technician"]}>
              <TechniciansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["technician"]}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
