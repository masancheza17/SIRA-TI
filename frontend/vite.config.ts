import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Configuración de Vite para SIRA TI.
// El servidor de desarrollo escucha en el puerto 5173 y expone el
// host para funcionar correctamente dentro de Docker.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
