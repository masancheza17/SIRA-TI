<div align="center">

# SIRA TI

**Plataforma web de gestión de servicios de TI (Service Desk / CRM)**
para empresas de soporte técnico: clientes, técnicos, tickets, incidentes, SLA y KPIs en un solo lugar.

[![CI](https://github.com/masancheza17/SIRA-TI/actions/workflows/ci.yml/badge.svg)](https://github.com/masancheza17/SIRA-TI/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-green.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.2%20LTS-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

</div>

<!-- Agrega aquí capturas de pantalla, por ejemplo:
![Dashboard](docs/img/dashboard.png)
-->

## Contenido

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Inicio rápido](#inicio-rápido)
- [Configuración](#configuración)
- [Roles y flujo de trabajo](#roles-y-flujo-de-trabajo)
- [API REST](#api-rest)
- [Seguridad](#seguridad)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Características

- **Tickets** con ciclo de vida completo: creación, asignación, cambio de estado y prioridad, comentarios (públicos e internos), imágenes adjuntas e historial de auditoría.
- **Incidentes y solicitudes**: clasificación ITIL de cada ticket, con atributos adicionales para incidentes (impacto, urgencia, causa raíz).
- **SLA**: tiempos máximos de respuesta y solución por prioridad; el cumplimiento se calcula automáticamente en el servidor.
- **Catálogo de servicios** ITIL con técnico responsable y SLA por defecto.
- **Dashboard y reportes** con KPIs y gráficos, filtrados según el rol de quien consulta.
- **Tres portales por rol** (Administrador, Técnico, Cliente), con permisos validados siempre en el backend.
- **Autenticación JWT** con renovación y cierre de sesión que invalida el token, más recuperación de contraseña por correo.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide React |
| Backend | Python 3.12, Django 5.2 LTS, Django REST Framework, SimpleJWT, WhiteNoise, Gunicorn |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker, Docker Compose, GitHub Actions |

## Arquitectura

```
React (5173)  ──HTTP/JSON + JWT──▶  Django REST Framework (8000)  ──▶  PostgreSQL (5432)
```

Frontend y backend están completamente separados y solo se comunican por la API REST. Las reglas de negocio importantes viven en el backend y **no** dependen de que la interfaz las respete: la autorización por rol, el filtrado de datos, el cálculo de SLA y los KPIs se resuelven en el servidor.

```
backend/apps/
├── users/         Usuarios, roles, autenticación y permisos
├── clients/       Clientes
├── technicians/   Técnicos
├── tickets/       Tickets, catálogos, comentarios, adjuntos e historial
├── incidents/     Incidentes (extensión ITIL de un ticket)
├── services/      Catálogo de servicios
├── sla/           Acuerdos de nivel de servicio y su cumplimiento
└── dashboard/     KPIs y datos para los gráficos
```

**Modelo de datos (relaciones principales)**

- `User` ↔ `Client` / `Technician`: un usuario puede tener un perfil de cliente o de técnico para entrar a su portal.
- `Ticket` pertenece a un `Client` y puede tener `Technician`, `Category`, `Priority`, `Status`, `Service` y `SLA`; acumula `Comment`s y `TicketHistory`.
- `Incident` extiende 1 a 1 a un `Ticket` con datos ITIL.
- `SLA` se vincula a una `Priority` y define tiempos máximos en minutos.

Más detalle del frontend (estructura, autenticación, sistema de diseño) en [`frontend/DESIGN.md`](frontend/DESIGN.md).

## Inicio rápido

### Con Docker (recomendado)

Requiere [Docker](https://docs.docker.com/get-docker/) con Docker Compose.

```bash
# 1. Variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Levantar base de datos, backend y frontend
docker compose up --build

# 3. En otra terminal: migraciones y datos de ejemplo
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_data
```

| Servicio | URL |
|---|---|
| Aplicación (frontend) | http://localhost:5173 |
| API | http://localhost:8000/api |
| Admin de Django | http://localhost:8000/admin |

### Sin Docker

Requiere Python 3.12+, Node.js 20+ y PostgreSQL 16+.

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # y cambia POSTGRES_HOST=db por POSTGRES_HOST=localhost
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

**Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Usuarios de ejemplo

`seed_data` crea tres usuarios para probar cada portal. **Son solo para desarrollo** (con `DEBUG=True`); fuera de desarrollo las contraseñas se generan al azar (ver [Configuración](#configuración)).

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin123*` | Administrador |
| `tecnico1` | `Tecnico123*` | Técnico |
| `cliente1` | `Cliente123*` | Cliente |

## Configuración

Toda la configuración se lee de variables de entorno (archivo `backend/.env`, que **nunca** se sube a git). El archivo [`backend/.env.example`](backend/.env.example) documenta cada una.

| Variable | Por defecto | Descripción |
|---|---|---|
| `DEBUG` | `False` | `True` solo en desarrollo. |
| `SECRET_KEY` | _(clave de desarrollo)_ | **Obligatoria con `DEBUG=False`**: mínimo 32 caracteres; si no, la app no arranca. |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts permitidos, separados por coma. |
| `POSTGRES_DB` / `_USER` / `_PASSWORD` / `_HOST` / `_PORT` | `sira_ti` / `sira_user` / – / `localhost` / `5432` | Conexión a la base de datos. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes del frontend permitidos. |
| `CSRF_TRUSTED_ORIGINS` | _(vacío)_ | Orígenes confiables para CSRF (producción por HTTPS). |
| `FRONTEND_URL` | `http://localhost:5173` | Se usa en el enlace de recuperación de contraseña. |
| `JWT_ACCESS_TOKEN_LIFETIME_MIN` | `60` | Duración del token de acceso, en minutos. |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7` | Duración del token de renovación, en días. |
| `USE_HTTPS` | `False` | Activa redirección a HTTPS, cookies seguras y HSTS. |
| `NUM_PROXIES` | _(sin definir)_ | Número de proxies delante de la app (usa `1` en Render). |
| `LOGIN_THROTTLE_RATE` | `10/min` | Límite de intentos de login por IP. |
| `PASSWORD_RESET_THROTTLE_RATE` | `10/hour` | Límite de solicitudes de recuperación por IP. |
| `TICKET_ATTACHMENT_MAX_SIZE_MB` / `_MAX_FILES` | `5` / `5` | Límites de imágenes adjuntas. |
| `SEED_ADMIN_PASSWORD` / `SEED_TECH_PASSWORD` / `SEED_CLIENT_PASSWORD` | _(aleatoria)_ | Contraseñas de `seed_data` con `DEBUG=False`; si no se definen, se generan y se muestran una sola vez. |

El frontend solo necesita `VITE_API_URL` (ver `frontend/.env.example`).

## Roles y flujo de trabajo

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Acceso completo: dashboard, clientes, técnicos, usuarios, tickets, servicios, SLA y reportes. Es el único que puede editar o eliminar tickets directamente y modificar los catálogos. |
| **Técnico** | Ve solo los tickets que tiene asignados. Cambia su estado y prioridad, los comenta (incluso con notas internas) y consulta clientes. |
| **Cliente** | Crea tickets y consulta solo los suyos, con comentarios públicos, adjuntos y cumplimiento de SLA. No ve las notas internas del equipo. |

**Flujo típico:** el cliente crea el ticket → un administrador o técnico lo asigna → el ticket avanza por *Asignado → En proceso → Resuelto → Cerrado* → los tiempos de respuesta y solución y el cumplimiento de SLA se calculan automáticamente.

## API REST

Todos los endpoints requieren `Authorization: Bearer <token>`, excepto los de autenticación.

```
# Autenticación
POST   /api/auth/login/                       Iniciar sesión (access, refresh y rol)
POST   /api/auth/refresh/                     Renovar tokens (rota el refresh token)
POST   /api/auth/logout/                      Cerrar sesión (invalida el refresh token)
POST   /api/auth/password-reset/              Solicitar recuperación de contraseña
POST   /api/auth/password-reset/confirm/      Confirmar nueva contraseña

# Usuarios
GET    /api/users/me/                         Perfil del usuario autenticado
POST   /api/users/change_password/            Cambiar contraseña
*      /api/users/                            CRUD de usuarios (solo Administrador)

# Clientes y técnicos
*      /api/clients/                          CRUD de clientes (Administrador y Técnico)
*      /api/technicians/                      Lectura: Admin/Técnico · Escritura: Administrador

# Tickets
GET|POST /api/tickets/                        Listar / crear (filtrado automático por rol)
GET      /api/tickets/{id}/                   Detalle, comentarios, historial y SLA
PUT|PATCH|DELETE /api/tickets/{id}/           Solo Administrador
POST     /api/tickets/{id}/assign/            Asignar técnico (Admin/Técnico)
POST     /api/tickets/{id}/change_status/     Cambiar estado (Admin/Técnico)
POST     /api/tickets/{id}/change_priority/   Cambiar prioridad (Admin/Técnico)
POST     /api/tickets/{id}/change_type/       Reclasificar incidente/solicitud (Admin/Técnico)
POST     /api/tickets/{id}/close/             Registrar solución y cerrar (Admin/Técnico)
GET|POST /api/tickets/{id}/comments/          Listar / agregar comentarios
GET|POST /api/tickets/{id}/attachments/       Listar / adjuntar imágenes
GET      /api/tickets/categories|priorities|statuses/   Catálogos (escritura: Administrador)

# Otros módulos
*      /api/incidents/                        Incidentes
*      /api/sla/                              Lectura: todos · Escritura: Administrador
*      /api/services/                         Lectura: todos · Escritura: Administrador
GET    /api/dashboard/summary/                KPIs y gráficos, filtrados por rol
```

## Seguridad

- Contraseñas con hash PBKDF2 y validadores estándar de Django (longitud, similitud, contraseñas comunes).
- **JWT** con rotación de refresh tokens y *blacklist*: al cerrar sesión o renovar, el token anterior deja de servir.
- **Límite de intentos** por IP en el login y en la recuperación de contraseña.
- **Autorización por rol en el backend** (clases de permisos DRF) y filtrado de datos por `queryset`: un técnico no puede consultar tickets de otro aunque manipule la URL, y un cliente no recibe los comentarios internos desde la API.
- Los clientes no pueden editar, borrar ni cambiar el estado de un ticket por la API directa; solo el personal autorizado, a través de acciones que dejan historial.
- Con `DEBUG=False`, la aplicación **se niega a arrancar** sin una `SECRET_KEY` propia y segura.
- Modo HTTPS opcional (`USE_HTTPS`): redirección, cookies seguras y HSTS.
- Mensajes genéricos en la recuperación de contraseña (no revelan si un correo existe).
- CORS restringido a los orígenes configurados; ningún secreto está en el código.

¿Encontraste una vulnerabilidad? Por favor repórtala de forma privada desde la pestaña **Security** del repositorio de GitHub, en lugar de abrir un issue público.

## Pruebas

```bash
cd backend
python manage.py test
```

La suite usa `APITestCase` de Django REST Framework y cubre autenticación, ciclo de vida de tickets, cálculo de SLA, KPIs del dashboard, adjuntos y los controles de acceso por rol (qué **no** puede hacer cada usuario). Hace falta una base PostgreSQL accesible con las variables de `.env`.

El frontend se valida con `npx tsc -b` y `npm run build`. Ambas suites corren en GitHub Actions en cada push y pull request (ver [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Despliegue

El `docker-compose.yml` está pensado para **desarrollo local**. Para producción (por ejemplo en Render u otro proveedor):

1. Define las variables de entorno: `DEBUG=False`, una `SECRET_KEY` propia, `ALLOWED_HOSTS`, los datos de PostgreSQL, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `FRONTEND_URL`.
2. Activa `USE_HTTPS=True` y, si hay un proxy delante, `NUM_PROXIES=1`.
3. En cada despliegue ejecuta `python manage.py migrate` y `python manage.py collectstatic --noinput`.
4. Sirve la aplicación con Gunicorn: `gunicorn config.wsgi:application`.
5. Para crear los usuarios iniciales usa `python manage.py seed_data` (con `DEBUG=False` genera contraseñas aleatorias y las muestra una vez) o `python manage.py createsuperuser`.
6. Compila el frontend con `npm run build` apuntando `VITE_API_URL` a la URL pública de la API.

El límite de intentos usa la caché del proceso: con varios workers de Gunicorn cada uno cuenta por separado. Para un límite global, configura una caché compartida (por ejemplo Redis).

## Estructura del proyecto

```
SIRA-TI/
├── backend/            API Django (apps/, config/, Dockerfile, requirements.txt)
├── frontend/           Aplicación React (src/, Dockerfile, DESIGN.md)
├── .github/workflows/  Integración continua
├── docker-compose.yml  Entorno de desarrollo (db + backend + frontend)
└── LICENSE
```

## Limitaciones conocidas

- El envío de correos usa por defecto el backend de consola (el enlace de recuperación aparece en los logs); falta configurar SMTP para correos reales.
- No hay exportación de reportes a PDF/Excel ni notificaciones en tiempo real.
- El frontend no tiene configuración de ESLint todavía (el script `npm run lint` está declarado pero falta el archivo de reglas).

## Contribuir

Las contribuciones son bienvenidas. Trabaja en una rama (`feature/...` o `fix/...`), usa mensajes de commit al estilo `feat:`, `fix:`, `docs:` y asegúrate de que `python manage.py test` y `npm run build` pasen antes de abrir un pull request.

## Licencia

Distribuido bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE).
