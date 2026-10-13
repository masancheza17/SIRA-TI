# Arquitectura y diseño del frontend — SIRA TI

Este documento explica las piezas fundamentales del frontend: cómo está
organizado, cómo funciona la autenticación, cómo se arma cada portal por
rol y cómo extender el sistema de diseño. Está pensado como referencia
rápida para cualquier persona que se incorpore al proyecto.

## 1. Estructura de carpetas

```
frontend/src/
├── components/     Piezas reutilizables sin lógica de negocio propia
│                    (Logo, StatCard, Modal, EmptyState, WelcomeBanner...)
├── contexts/        Estado global de React (AuthContext = sesión)
├── layouts/         Estructura de página: AuthLayout, DashboardLayout,
│                    Navbar, Sidebar
├── pages/           Una página = una ruta. Contienen la lógica de datos
│                    (llamadas a la API) de esa pantalla.
├── routes/          Árbol de rutas (AppRoutes) y guardas de acceso
│                    (ProtectedRoute)
├── services/        Cliente HTTP (api.ts) y su manejo de tokens JWT
└── types/           Tipos TypeScript compartidos, alineados con los
                     serializers del backend
```

Regla general: los **componentes** no llaman a la API ni conocen rutas;
las **páginas** sí. Los **layouts** solo aportan estructura visual y no
tienen lógica de negocio (aparte de UI local como abrir/cerrar el menú
móvil).

## 2. Autenticación y sesión

- `services/api.ts` — cliente Axios único de la aplicación. Adjunta el
  token JWT a cada petición y, si el backend responde `401`, intenta
  refrescar el token una sola vez antes de reintentar la petición
  original. Si el refresh falla, limpia la sesión y redirige a
  `/login`.
- `contexts/AuthContext.tsx` — expone `user`, `isLoading`, `login()` y
  `logout()` a toda la aplicación. Al montar la app, si hay un token
  guardado, intenta restaurar la sesión con `GET /api/users/me/` para
  que recargar la página no obligue a iniciar sesión de nuevo.
- `routes/ProtectedRoute.tsx` — envuelve las rutas privadas. Si no hay
  sesión, redirige a `/login` (y recuerda a dónde volver). Si hay
  sesión pero el rol no está autorizado para esa ruta (`allowedRoles`),
  redirige al dashboard en vez de mostrar la página.

**Importante:** esta protección en el frontend es solo de UX (evita
que un usuario vea una pantalla que no le corresponde). La
autorización real —qué datos puede leer o modificar cada rol— siempre
se valida en el backend con clases de permisos DRF. Un frontend nunca
debe ser la única barrera de seguridad.

## 3. Un layout por tipo de pantalla

### 3.1 Pantallas públicas → `layouts/AuthLayout.tsx`

Login, recuperación y restablecimiento de contraseña comparten este
layout: un panel de marca (oculto en móvil) con el logo, la propuesta
de valor del producto y tres pilares del sistema, y un panel de
formulario a la derecha. Cada página (`LoginPage`, `ForgotPasswordPage`,
`ResetPasswordPage`) solo aporta su título, subtítulo, formulario y pie
de página; toda la estructura visual vive en un solo lugar.

Extender este layout (por ejemplo, agregar una cuarta pantalla pública)
solo requiere envolver el contenido en `<AuthLayout title="..."
subtitle="...">...</AuthLayout>`.

### 3.2 Pantallas autenticadas → `layouts/DashboardLayout.tsx`

Compone `Sidebar` + `Navbar` + el contenido de la ruta activa
(`<Outlet />`). También es dueño del estado `mobileNavOpen`, porque es
el ancestro común entre el botón que abre el menú (`Navbar`) y el panel
que lo muestra (`Sidebar`) en pantallas pequeñas.

## 4. Cómo se arma "un portal por rol"

No existen tres aplicaciones separadas: hay una sola app cuyo contenido
se adapta según `user.role` (`"admin" | "technician" | "client"`,
definido en `types/index.ts`). Las piezas que generan esa sensación de
portal distinto son:

1. **`layouts/Sidebar.tsx`** — el menú (`MENUS`) es un diccionario por
   rol, agrupado en secciones (Principal, Gestión, Soporte, Análisis,
   Sistema). Además del menú, muestra una etiqueta ("Portal
   Administrador" / "Portal Técnico" / "Portal Cliente") para reforzar
   en qué espacio está el usuario.
2. **`layouts/Navbar.tsx`** — muestra el nombre, las iniciales y una
   insignia de color por rol (`ROLE_BADGE_STYLES`), además del título
   de la página actual, calculado a partir de la ruta (`PAGE_TITLES`).
3. **`components/WelcomeBanner.tsx`** — usado en `DashboardPage`,
   cambia el mensaje de bienvenida según el rol (`ROLE_COPY`): un
   administrador ve un mensaje orientado a la operación completa, un
   técnico a su carga de trabajo, un cliente a sus solicitudes.
4. **`routes/AppRoutes.tsx`** — algunas rutas están envueltas en un
   `ProtectedRoute` adicional con `allowedRoles` (por ejemplo
   `/users` solo para `admin`), de modo que ni siquiera navegando la
   URL a mano un rol no autorizado puede llegar a la pantalla (la
   protección de datos real, de nuevo, está en el backend).

Para agregar un nuevo rol o una nueva sección de un portal existente,
los puntos de cambio son, en este orden: `types/index.ts` (si es un rol
nuevo), `layouts/Sidebar.tsx` (menú), `routes/AppRoutes.tsx` (rutas) y,
si aplica, `components/WelcomeBanner.tsx`.

## 5. Sistema de diseño

- **Paleta**: definida una sola vez en `tailwind.config.js` bajo
  `theme.extend.colors.sira`. No se agregan colores de marca fuera de
  ahí; los únicos colores adicionales permitidos son neutros
  (grises/blanco) y los semánticos de alerta (ámbar/rojo/verde) que ya
  usan `StatusBadge`/`StatCard` para estados de SLA y KPIs.
- **Tipografía**: Inter, cargada en `index.html` vía Google Fonts y
  declarada como `fontFamily.sans` en `tailwind.config.js`.
- **Logo**: ver la sección "Logotipo" en el `README.md` de la raíz del
  proyecto y los comentarios en `components/Logo.tsx` y
  `public/logo.svg`.
- **Componentes compartidos** (`components/`): `StatCard`, `StatusBadge`
  / `PriorityBadge` / `SlaBadge`, `EmptyState`, `LoadingState`,
  `ErrorState`, `Modal`, `FormField` y `WelcomeBanner`. Antes de crear
  un elemento visual nuevo (tarjeta, badge, estado vacío, etc.), revisar
  si ya existe uno de estos para no fragmentar el estilo de la app.
- **Sombra reutilizable**: `shadow-soft` (definida en
  `tailwind.config.js`) para paneles que necesitan más profundidad que
  `shadow-sm` sin llegar a `shadow-lg`.
- **Accesibilidad de foco**: el anillo de foco de todos los elementos
  interactivos (`:focus-visible`) usa el color de marca en vez del azul
  por defecto del navegador; está definido una sola vez en
  `index.css`, no hace falta repetirlo por componente.

## 6. Próximos pasos sugeridos (fuera de esta entrega)

- Extender el mismo criterio de "portal por rol" a las tablas de
  `TicketsPage`, `ClientsPage`, etc. (por ejemplo, columnas visibles
  distintas por rol), si el negocio lo requiere.
- Code-splitting por ruta (`React.lazy`) para reducir el tamaño del
  bundle inicial, señalado por el warning de Vite en el build de
  producción.
- Modo oscuro, si se convierte en un requisito de producto (la paleta
  actual está pensada para fondo claro; requeriría tokens adicionales).
