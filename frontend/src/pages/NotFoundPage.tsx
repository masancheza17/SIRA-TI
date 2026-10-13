import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/Logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sira-light/40 px-4 text-center">
      <div className="mb-8">
        <Logo theme="dark" size="md" />
      </div>

      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sira-primary/10 text-sira-primary">
        <Compass className="h-7 w-7" />
      </span>

      <p className="text-6xl font-bold text-sira-dark">404</p>
      <h1 className="mt-2 text-xl font-semibold text-sira-dark">Página no encontrada</h1>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        La página que buscas no existe, fue movida o no tienes acceso a ella desde tu portal.
      </p>

      <Link
        to="/dashboard"
        className="mt-8 flex items-center gap-2 rounded-md bg-sira-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sira-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>
    </div>
  );
}
