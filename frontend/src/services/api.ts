import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

/**
 * Cliente Axios centralizado para SIRA TI.
 *
 * Adjunta automáticamente el token JWT de acceso a cada petición y,
 * si el backend responde 401 (token expirado), intenta refrescarlo
 * una sola vez usando el refresh token antes de reintentar la
 * petición original. Si el refresh también falla, limpia la sesión
 * y redirige al login.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const ACCESS_TOKEN_KEY = "sira_access_token";
const REFRESH_TOKEN_KEY = "sira_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_TOKEN_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry || !tokenStorage.getRefresh()) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Ya hay un refresh en curso: espera a que termine y reintenta.
      return new Promise((resolve) => {
        pendingRequests.push(() => resolve(api(originalRequest)));
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refresh = tokenStorage.getRefresh();
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh/`,
        { refresh }
      );
      tokenStorage.setAccess(data.access);
      pendingRequests.forEach((cb) => cb());
      pendingRequests = [];
      return api(originalRequest);
    } catch (refreshError) {
      tokenStorage.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
