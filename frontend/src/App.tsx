import { AuthProvider } from "@/contexts/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";

/**
 * Componente raíz de SIRA TI. Envuelve toda la aplicación en el
 * AuthProvider (sesión) y delega el enrutamiento a AppRoutes.
 * BrowserRouter se monta una sola vez en main.tsx.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
