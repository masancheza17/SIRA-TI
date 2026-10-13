import { LayoutDashboard, ShieldCheck, Ticket } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

/**
 * Layout compartido de las pantallas públicas (login, recuperación y
 * restablecimiento de contraseña).
 *
 * Antes cada pantalla repetía su propia tarjeta centrada sobre un
 * fondo plano. Este layout las unifica en un panel dividido:
 *   - Panel izquierdo (solo escritorio): identidad de marca, propuesta
 *     de valor del producto y los tres pilares del sistema. Se oculta
 *     en pantallas pequeñas para no restar espacio al formulario.
 *   - Panel derecho: el formulario propiamente dicho (`children`),
 *     con el logo visible también en móvil.
 *
 * Mantiene toda la lógica de negocio en cada página; este componente
 * solo aporta estructura y presentación.
 */
const FEATURES = [
  {
    icon: Ticket,
    title: "Tickets centralizados",
    description: "Todo el ciclo de vida de una solicitud, en un solo lugar.",
  },
  {
    icon: ShieldCheck,
    title: "Cumplimiento de SLA",
    description: "Tiempos de respuesta y solución calculados automáticamente.",
  },
  {
    icon: LayoutDashboard,
    title: "Un portal por rol",
    description: "Administradores, técnicos y clientes ven solo lo que necesitan.",
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Panel de marca (oculto en móvil) */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-sira-dark via-sira-dark to-sira-primary px-12 py-12 text-white lg:flex">
        {/* Patrón de puntos sutil, puramente decorativo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative">
          <Logo theme="light" size="lg" />
        </div>

        <div className="relative max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight">
            Mesa de servicio TI, sin fricción.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sira-soft">
            SIRA TI centraliza clientes, técnicos, tickets y SLA para que tu
            equipo de soporte trabaje ordenado y tus clientes siempre sepan en
            qué va su solicitud.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map(({ icon: Icon, title: featureTitle, description }) => (
              <li key={featureTitle} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{featureTitle}</p>
                  <p className="text-xs text-sira-soft">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sira-soft/70">
          © {new Date().getFullYear()} SIRA TI — Sistema Integral de Registro y Atención de TI
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo theme="dark" size="md" />
          </div>

          <h1 className="text-2xl font-semibold text-sira-dark">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-gray-500">{subtitle}</p>

          {children}

          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
