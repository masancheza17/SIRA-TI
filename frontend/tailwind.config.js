/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Identidad visual obligatoria de SIRA TI.
      // No agregar colores adicionales como identidad principal;
      // usar neutros (blanco/gris/negro) solo para legibilidad y contraste.
      colors: {
        sira: {
          dark: "#031926",   // Navegación, sidebar, elementos importantes
          primary: "#468189", // Acciones y elementos destacados
          secondary: "#77ACA2", // Elementos secundarios, estados positivos
          soft: "#9DBEBB",   // Fondos secundarios, bordes suaves
          light: "#F4E9CD",  // Fondos claros, contraste
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      // Sombra suave reutilizable para tarjetas y paneles, alternativa
      // un poco más marcada que `shadow-sm` sin llegar a `shadow-lg`.
      boxShadow: {
        soft: "0 1px 2px rgba(3, 25, 38, 0.06), 0 6px 16px -4px rgba(3, 25, 38, 0.08)",
      },
    },
  },
  plugins: [],
};
