import axios from "axios"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import api, { tokenStorage } from "@/services/api";
import type { AuthUser, Role } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provee el estado de sesión a toda la aplicación.
 *
 * Al montar, si hay un token guardado, intenta recuperar el perfil
 * del usuario (GET /api/users/me/) para restaurar la sesión sin
 * pedir login de nuevo al recargar la página.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = tokenStorage.getAccess();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/users/me/");
        setUser({
          id: data.id,
          username: data.username,
          full_name: `${data.first_name} ${data.last_name}`.trim() || data.username,
          email: data.email,
          role: data.role_name as Role,
        });
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post("/auth/login/", { username, password });
    tokenStorage.setTokens(data.access, data.refresh);
    setUser(data.user as AuthUser);
    return data.user as AuthUser;
  };

  const logout = () => {
    // Invalida el refresh token en el servidor para que no pueda reutilizarse.
    // Se usa axios "plano" (sin el token de acceso, que puede estar vencido) y no se
    // espera la respuesta: la sesión local se cierra siempre, falle o no la red.
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      axios.post(`${api.defaults.baseURL}/auth/logout/`, { refresh }).catch(() => undefined);
    }
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
