# SIRA TI

Plataforma web CRM / Service Desk para empresas de soporte técnico y TI. Centraliza la gestión de clientes, técnicos, tickets, incidentes, SLA, catálogo de servicios ITIL y KPIs.

> **Estado: todas las fases implementadas y verificadas** (backend con pruebas automatizadas pasando, frontend compilado sin errores de TypeScript ni de build).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS + React Router + Axios + Recharts + Lucide React |
| Backend | Python + Django + Django REST Framework + JWT (SimpleJWT) |
| Base de datos | PostgreSQL |
| Infraestructura | Docker + Docker Compose (+ Nginx en producción) |

## Arquitectura

```
React (5173) → API REST (/api/...) → Django REST Framework (8000) → PostgreSQL (5432)
```

Frontend y backend están completamente separados y se comunican solo vía HTTP/JSON con autenticación JWT. La autorización por rol se valida **siempre en el backend** (clases de permisos DRF), nunca solo en el frontend.

### Módulos backend (arquitectura modular)

```
backend/apps/
├── users/         Usuarios, roles, autenticación JWT, permisos por rol
├── clients/       CRUD de clientes
├── technicians/   CRUD de técnicos
├── tickets/       Tickets, categorías, prioridades, estados, comentarios, historial
├── incidents/     Incidentes (extensión ITIL de Ticket)
├── services/      Catálogo de servicios ITIL
├── sla/           Acuerdos de Nivel de Servicio y su cálculo de cumplimiento
└── dashboard/     Agregación de KPIs y datos para gráficos
```

### Modelo de datos

Entidades principales y relaciones clave:

- **User** (1) — (1) **Client** / **Technician** — un usuario puede tener un perfil de cliente o técnico asociado para iniciar sesión en su portal correspondiente.
- **Ticket**: pertenece a un `Client`, puede tener un `Technician` asignado, una `Category`, `Priority`, `Status`, `Service` y `SLA`. Tiene `Comment`s y `TicketHistory` (auditoría) relacionados.
- **Incident**: extensión 1 a 1 de `Ticket` (vía `ticket_type="incident"`) con atributos ITIL adicionales (impacto, urgencia, causa raíz).
- **SLA**: vinculado a una `Priority`; define tiempos máximos de respuesta/solución en minutos.
- **Service**: catálogo ITIL, vinculado opcionalmente a un `Technician` responsable y a un `SLA` por defecto.

Todos los cálculos de tiempos de SLA y KPIs se hacen en el backend (`Ticket.sla_compliance()` y `apps/dashboard/views.py`), nunca en el frontend, para que no puedan manipularse desde el cliente.

## Identidad visual

SIRA TI utiliza exclusivamente esta paleta como identidad principal (definida en `frontend/tailwind.config.js` bajo `sira.*`):

| Token | Hex | Uso |
|---|---|---|
| `sira-dark` | `#031926` | Navegación, sidebar, elementos importantes |
| `sira-primary` | `#468189` | Acciones y elementos destacados |
| `sira-secondary` | `#77ACA2` | Elementos secundarios, estados positivos |
| `sira-soft` | `#9DBEBB` | Fondos secundarios, bordes suaves |
| `sira-light` | `#F4E9CD` | Fondos claros, contraste |

No se usan emojis en ninguna parte de la interfaz; los íconos son exclusivamente de **Lucide React**.

## Requisitos previos

- Docker y Docker Compose
- (Opcional para desarrollo local sin Docker) Python 3.12+, Node.js 20+, PostgreSQL 16+

## Puesta en marcha con Docker

1. Copiar las variables de entorno de ejemplo:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Ajustar `SECRET_KEY`, credenciales de PostgreSQL y demás valores sensibles en `backend/.env`.

3. Levantar los servicios:

   ```bash
   docker compose up --build
   ```

4. Ejecutar migraciones y cargar datos iniciales (en otra terminal, con los contenedores corriendo):

   ```bash
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py seed_data
   docker compose exec backend python manage.py createsuperuser   # opcional, admin adicional
   ```

5. Servicios disponibles:
   - Frontend: http://localhost:5173
   - Backend / API: http://localhost:8000/api
   - Panel de administración Django: http://localhost:8000/admin
   - PostgreSQL: localhost:5432

## Puesta en marcha manual (sin Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # y ajustar valores, apuntando POSTGRES_HOST a localhost
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Manual de usuario rápido

Tras ejecutar `seed_data`, quedan disponibles tres usuarios de prueba:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin123*` | Administrador |
| `tecnico1` | `Tecnico123*` | Técnico |
| `cliente1` | `Cliente123*` | Cliente |

**Como Administrador**: acceso completo a Dashboard, Clientes, Técnicos, Usuarios, Tickets, Catálogo de servicios, SLA y Reportes.

**Como Técnico**: ve únicamente los tickets que tiene asignados. Puede cambiar su estado/prioridad, comentar, y consultar clientes.

**Como Cliente**: puede crear tickets nuevos (botón "Crear ticket") y consultar únicamente los suyos, con su historial de comentarios y el estado de cumplimiento de SLA.

Flujo típico de un ticket: **Cliente crea el ticket → Administrador o Técnico lo asigna → cambia de estado a medida que avanza (Asignado → En proceso → Resuelto → Cerrado) → se calculan automáticamente los tiempos de respuesta/solución y el cumplimiento del SLA.**

## API REST

Todos los endpoints requieren un token JWT (`Authorization: Bearer <token>`), excepto login y recuperación de contraseña.

```
POST   /api/auth/login/                     Iniciar sesión (devuelve access, refresh y rol)
POST   /api/auth/refresh/                   Refrescar el token de acceso
POST   /api/auth/password-reset/            Solicitar recuperación de contraseña
POST   /api/auth/password-reset/confirm/    Confirmar nueva contraseña

GET    /api/users/me/                       Perfil del usuario autenticado
POST   /api/users/change_password/          Cambiar contraseña (autenticado)
GET|POST /api/users/                        CRUD de usuarios (solo Administrador)

GET|POST|PUT|PATCH /api/clients/            CRUD de clientes (Admin y Técnico)
GET|POST|PUT|PATCH /api/technicians/        CRUD de técnicos (lectura: Admin/Técnico, escritura: Admin)

GET|POST /api/tickets/                      Listar / crear tickets (filtrado automático por rol)
GET      /api/tickets/{id}/                 Detalle de ticket (incluye comentarios, historial, sla_compliance)
POST     /api/tickets/{id}/assign/          Asignar técnico
POST     /api/tickets/{id}/change_status/   Cambiar estado
POST     /api/tickets/{id}/change_priority/ Cambiar prioridad
GET|POST /api/tickets/{id}/comments/        Listar / agregar comentarios
POST     /api/tickets/{id}/close/           Registrar solución y cerrar
GET      /api/tickets/categories|priorities|statuses/   Catálogos

GET|POST /api/incidents/                    CRUD de incidentes (crea Ticket + Incident en una llamada)

GET|POST|PUT|PATCH /api/sla/                CRUD de SLA (lectura: todos, escritura: Admin)
GET|POST|PUT|PATCH /api/services/           CRUD del catálogo de servicios (lectura: todos, escritura: Admin)

GET    /api/dashboard/summary/              KPIs y datos de gráficos, filtrados por rol
```

## Seguridad implementada

- Contraseñas con hash seguro (hasher por defecto de Django, PBKDF2).
- Autenticación JWT con rotación y blacklist de refresh tokens (`djangorestframework-simplejwt`).
- Autorización por rol validada en el backend con clases de permisos DRF (`apps/users/permissions.py`); el frontend solo oculta opciones de UI por comodidad.
- Filtrado de datos por rol a nivel de `queryset` (un técnico nunca puede consultar tickets de otro técnico vía API, aunque manipule la URL).
- CORS restringido a los orígenes configurados por variable de entorno.
- Todas las credenciales y claves sensibles se leen de variables de entorno (`.env`), nunca hardcodeadas.
- Validación de contraseñas con los validadores estándar de Django (longitud mínima, similitud con datos del usuario, contraseñas comunes).
- Mensajes de error genéricos en recuperación de contraseña (no revelan si un correo existe o no).

## Pruebas

Suite de pruebas automatizadas con `APITestCase` de Django REST Framework, cubriendo:

- Autenticación (login exitoso/fallido, rol devuelto, endpoints protegidos).
- Ciclo de vida completo de un ticket (creación, asignación, cambio de estado, cálculo de tiempos de SLA).
- Aislamiento de datos por rol (un técnico no ve tickets ajenos; un cliente no accede a `/api/technicians/`).
- Cálculo correcto de KPIs del dashboard.

Ejecutar:

```bash
cd backend
python manage.py test
```

El frontend se validó con compilación estricta de TypeScript (`npx tsc -b`) y build de producción (`npm run build`), ambos sin errores.

## Roadmap de fases

- [x] **Fase 1** — Estructura del proyecto
- [x] **Fase 2** — Modelos de base de datos, relaciones, migraciones y datos iniciales
- [x] **Fase 3** — Autenticación JWT, roles y permisos
- [x] **Fase 4** — CRUD de clientes y técnicos
- [x] **Fase 5** — Tickets e incidentes
- [x] **Fase 6** — SLA (cálculos, cumplimiento)
- [x] **Fase 7** — Catálogo de servicios ITIL
- [x] **Fase 8** — Dashboard y KPIs
- [x] **Fase 9** — UX/UI e identidad visual en todas las pantallas
- [x] **Fase 10** — Pruebas automatizadas (backend) y build verificado (frontend)
- [x] **Fase 11** — Documentación final

### Fuera de alcance de esta entrega (posibles siguientes pasos)

- Envío real de correos (actualmente backend de consola para desarrollo).
- Exportación de reportes a PDF/Excel.
- Notificaciones en tiempo real (WebSockets).
- Configuración de Nginx para despliegue productivo (la estructura de Docker ya está preparada para incorporarlo).

## Ramas de trabajo sugeridas

```
main
develop
feature/*
fix/*
```

Convención de commits: `feat:`, `fix:`, `docs:`, etc.
