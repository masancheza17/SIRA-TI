import { useState } from "react";

/**
 * ============================================================================
 * <Logo /> — PUNTO ÚNICO DE INTEGRACIÓN DE LA MARCA SIRA TI
 * ============================================================================
 * Todas las pantallas que necesitan mostrar el logo (sidebar, login,
 * recuperación de contraseña, error 404, etc.) usan este componente en
 * lugar de referenciar la imagen directamente. Esto significa que, para
 * poner el logo definitivo de la empresa, **solo hay que reemplazar el
 * archivo**:
 *
 *     frontend/public/logo.svg
 *
 * y toda la aplicación lo tomará automáticamente, sin tocar más código.
 * Ver el comentario dentro de ese archivo para instrucciones detalladas.
 *
 * Si la imagen no carga (archivo faltante, ruta rota, etc.) se muestra
 * automáticamente un monograma de respaldo ("S") con los colores de
 * marca, para que la interfaz nunca se vea rota.
 *
 * Props:
 *  - variant: "full" muestra ícono + nombre "SIRA TI" (uso por defecto).
 *             "mark" muestra solo el ícono, sin texto (para espacios
 *             reducidos o si el archivo de logo ya incluye el texto).
 *  - theme:   "light" para fondos oscuros (sidebar, panel de login) ->
 *             texto blanco. "dark" para fondos claros -> texto oscuro.
 *  - size:    controla el tamaño del ícono ("sm" | "md" | "lg").
 * ============================================================================
 */
interface LogoProps {
  variant?: "full" | "mark";
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MARK_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const WORDMARK_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export function Logo({ variant = "full", theme = "dark", size = "md", className = "" }: LogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const titleColor = theme === "light" ? "text-white" : "text-sira-dark";
  const subtitleColor = theme === "light" ? "text-sira-soft" : "text-gray-500";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {imgFailed ? (
        // Respaldo si /logo.svg no está disponible: monograma de marca.
        <span
          className={`flex ${MARK_SIZE[size]} shrink-0 items-center justify-center rounded-xl bg-sira-primary font-bold text-white`}
          aria-hidden="true"
        >
          S
        </span>
      ) : (
        <img
          src="/logo.svg"
          alt="SIRA TI"
          className={`${MARK_SIZE[size]} shrink-0 rounded-xl object-contain`}
          onError={() => setImgFailed(true)}
        />
      )}

      {variant === "full" && (
        <div className="leading-tight">
          <p className={`font-bold tracking-wide ${WORDMARK_SIZE[size]} ${titleColor}`}>SIRA TI</p>
          <p className={`text-[10px] font-medium uppercase tracking-widest ${subtitleColor}`}>
            Mesa de servicio
          </p>
        </div>
      )}
    </div>
  );
}
