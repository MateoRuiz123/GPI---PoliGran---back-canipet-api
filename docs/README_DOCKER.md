# Canipet — Docker Setup

## Estructura de contenedores

```
canipet_net (bridge)
 ├── db        → postgres:16-alpine   :5432
 ├── backend   → NestJS               :3000  (expuesto al host)
 └── frontend  → Next.js              :3001  (expuesto al host)
```

Los tres servicios comparten la red interna `canipet_net`, por lo que se
comunican por **nombre de servicio** (ej. el backend alcanza la BD en
`db:5432`).

## Requisitos previos

- Docker ≥ 24
- Docker Compose v2 (`docker compose` sin guion)

## Levantar todo con un solo comando

```bash
# Desde la raíz del repositorio
docker compose up --build
```

Esto:

1. Construye la imagen del backend (2 stages: build + prod).
2. Construye la imagen del frontend (2 stages: build + prod).
3. Levanta PostgreSQL, espera el healthcheck, luego arranca el backend
   (que ejecuta las migraciones via `synchronize: true` en desarrollo).
4. Arranca el frontend.

## URLs de acceso

| Servicio    | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:3001      |
| Backend API | http://localhost:3000/api  |
| Swagger     | http://localhost:3000/docs |

## Credenciales de prueba (seed automático)

| Campo      | Valor           |
| ---------- | --------------- |
| Correo     | admin@gpi.local |
| Contraseña | admin123        |

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Detener y eliminar contenedores (los datos de la BD persisten)
docker compose down

# Eliminar también el volumen de la BD
docker compose down -v

# Reconstruir solo una imagen
docker compose build backend
docker compose up -d backend
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores antes de desplegar
en un entorno real:

```bash
cp .env.example .env
```

> **Nota sobre `NEXT_PUBLIC_API_URL`**: Next.js incrusta esta variable
> en el bundle del cliente en tiempo de _build_. Por eso se pasa como
> `ARG` al `Dockerfile` del frontend. Si cambias la URL debes
> reconstruir la imagen (`docker compose build frontend`).
