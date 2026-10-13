import type { AuthUser, Role } from "@/types";

/**
 * Banner de bienvenida del dashboard. El mensaje cambia según el rol
 * para que cada portal (Administrador / Técnico / Cliente) se sienta
 * dirigido a esa audiencia en vez de mostrar el mismo texto genérico
 * a todos los usuarios.
 */
const ROLE_COPY: Record<Role, string> = {
  admin: "Aquí tienes la visión completa de la operación de soporte.",
  technician: "Estos son tus tickets asignados y tu carga de trabajo actual.",
  client: "Consulta el estado de tus solicitudes y crea nuevos tickets cuando lo necesites.",
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function WelcomeBanner({ user }: { user: AuthUser }) {
  const firstName = user.full_name.split(" ")[0];
  const today = capitalize(
    new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())
  );

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-sira-dark to-sira-primary px-6 py-6 text-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-widest text-sira-soft">{today}</p>
        <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Bienvenido, {firstName}</h1>
        <p className="mt-1 text-sm text-sira-soft">{ROLE_COPY[user.role]}</p>
      </div>
    </div>
  );
}
