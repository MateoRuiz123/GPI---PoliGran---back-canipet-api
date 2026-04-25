# Guía paso a paso: Frontend en Next.js + Tailwind

Sistema Canipet — frontend que consume la API NestJS del backend.

> Esta guía explica los **conceptos clave** y **decisiones** que hay detrás del código real que está en `front-canipet-web/`. Si algún día empiezas un proyecto nuevo desde cero, deberías poder usar este documento como mapa para no perderte.

---

## Tabla de contenido

1. [Stack y por qué de cada elección](#1-stack-y-por-qué-de-cada-elección)
2. [Crear el proyecto desde cero](#2-crear-el-proyecto-desde-cero)
3. [Estructura de carpetas y App Router](#3-estructura-de-carpetas-y-app-router)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Tailwind v4 y tokens de diseño](#5-tailwind-v4-y-tokens-de-diseño)
6. [Componentes UI propios (mini "shadcn")](#6-componentes-ui-propios-mini-shadcn)
7. [Cliente HTTP y manejo de errores](#7-cliente-http-y-manejo-de-errores)
8. [Autenticación con Context + JWT](#8-autenticación-con-context--jwt)
9. [Protección de rutas y autorización por rol](#9-protección-de-rutas-y-autorización-por-rol)
10. [Patrón de páginas con datos](#10-patrón-de-páginas-con-datos)
11. [Formularios](#11-formularios)
12. [Diálogos y confirmaciones](#12-diálogos-y-confirmaciones)
13. [Conexión backend ↔ frontend (CORS)](#13-conexión-backend--frontend-cors)
14. [Comandos útiles](#14-comandos-útiles)
15. [Próximos pasos sugeridos](#15-próximos-pasos-sugeridos)
16. [Mapa endpoints ↔ pantallas](#16-mapa-endpoints--pantallas)

---

## 1. Stack y por qué de cada elección

| Pieza | Elegido | Alternativa común | Por qué este |
|---|---|---|---|
| Framework | **Next.js 16 (App Router)** | Vite + React Router, Remix | Routing por carpetas (sin configurar nada), TypeScript de fábrica, hot reload con Turbopack, posible SSR cuando lo necesites. |
| Lenguaje | **TypeScript** | JavaScript | Te avisa de errores antes de ejecutar; los tipos del backend se reflejan literalmente en el front (`Pet`, `Appointment`, etc.). |
| Estilos | **TailwindCSS v4** | CSS Modules, styled-components | Clases utilitarias en el JSX, sin saltar a otro archivo, sin conflictos de nombres de clase. |
| UI base | **Componentes propios** + `lucide-react` (iconos) | shadcn/ui, Radix, MUI, Chakra | Aprendes qué hace cada componente, no hay magia, son ~10 archivos chicos. |
| HTTP | **`fetch` nativo** envuelto en `api.ts` | Axios, SWR, TanStack Query | Para entender cómo viaja el `Authorization: Bearer ...`. Cuando crezca el proyecto se reemplaza por TanStack Query sin tocar el resto. |
| Estado de auth | **React Context** + `localStorage` | Zustand, Redux, NextAuth | Es el patrón "primer día" de React; con un solo provider ya tienes el usuario en cualquier página. |
| Iconos | **lucide-react** | Heroicons, Tabler | API limpia (`<PawPrint />`), tree-shaking, mismo set que shadcn. |
| Package manager | **pnpm** | npm, yarn | Lo usás en el back. Más rápido y comparte el caché entre proyectos. |

> **Regla importante:** Next.js distingue **server components** (default) y **client components** (`"use client"` arriba). Como casi todo en este front usa hooks (`useState`, `useEffect`, contexto), todos los archivos de páginas y componentes interactivos llevan `"use client"`. Más detalles abajo.

---

## 2. Crear el proyecto desde cero

```bash
pnpm create next-app@latest front-canipet-web \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm --turbopack --yes
cd front-canipet-web
```

Significado de cada bandera:

| Bandera | Qué hace |
|---|---|
| `--typescript` | Genera `.ts/.tsx` y `tsconfig.json`. |
| `--tailwind` | Configura Tailwind v4 listo para usar. |
| `--eslint` | Añade `eslint-config-next`. |
| `--app` | Activa **App Router** (carpeta `app/`). La alternativa antigua era `pages/`. |
| `--src-dir` | Pone el código en `src/` (más ordenado). |
| `--import-alias "@/*"` | `@/lib/api` → `src/lib/api`. Evita rutas relativas largas. |
| `--turbopack` | Compilador rápido en dev. |

Dependencias adicionales que usamos:

```bash
pnpm add clsx tailwind-merge lucide-react
```

- `clsx` y `tailwind-merge`: para construir la utilidad `cn()` que une clases de Tailwind resolviendo conflictos.
- `lucide-react`: iconos.

Cambia el script `dev` en `package.json` para que el front no choque con el back:

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "start": "next start -p 3001"
  }
}
```

---

## 3. Estructura de carpetas y App Router

```
src/
├── app/                          ← App Router
│   ├── layout.tsx                ← layout raíz (envuelve <AuthProvider>)
│   ├── page.tsx                  ← redirige según sesión
│   ├── globals.css               ← Tailwind + tokens CSS
│   ├── (auth)/                   ← grupo de rutas SIN layout protegido
│   │   ├── layout.tsx
│   │   ├── login/page.tsx        → /login
│   │   └── register/page.tsx     → /register
│   └── (dashboard)/              ← grupo CON Navbar y guard
│       ├── layout.tsx            ← <ProtectedRoute><Navbar/></...>
│       ├── dashboard/page.tsx    → /dashboard
│       ├── pets/                 → /pets
│       ├── services/             → /services
│       ├── appointments/         → /appointments + /appointments/new
│       ├── agenda/               → /agenda           (vet/admin)
│       └── admin/vets/           → /admin/vets       (admin)
├── components/
│   ├── ui/                       ← Button, Input, Card, Dialog…
│   ├── navbar.tsx
│   ├── page-header.tsx
│   └── protected-route.tsx
└── lib/
    ├── api.ts                    ← fetch wrapper + ApiError
    ├── auth-context.tsx          ← AuthProvider + useAuth()
    ├── cn.ts                     ← util de clases
    ├── format.ts                 ← labels/tonos de enums + fechas
    └── types.ts                  ← tipos del dominio (espejo del back)
```

### Tres convenciones del App Router que tienes que conocer

1. **Cada carpeta = una ruta.** `app/pets/page.tsx` → `/pets`. Punto.
2. **`layout.tsx`** envuelve a sus rutas hijas. Por eso hay UN `layout.tsx` en `(dashboard)/` que pone Navbar + guard, y otro distinto en `(auth)/` que pone el fondo degradé. Los hijos heredan el layout del padre.
3. **Carpetas entre paréntesis** (`(auth)`, `(dashboard)`) son **route groups**: organizan archivos pero **no aparecen en la URL**. `/login` es `app/(auth)/login/page.tsx`. Súper útiles para tener un layout distinto sin cambiar la URL.

### Server vs Client components

Por defecto, todos los componentes en App Router son **server components** (se renderizan en el servidor). Para usar `useState`, `useEffect`, `useContext`, `onClick`, etc., el archivo necesita la directiva en la primera línea:

```tsx
"use client";
```

En este proyecto **casi todo** es client: páginas con datos (`pets`, `services`, `appointments`...), formularios, contexto. Los pocos archivos sin `"use client"` son los `layout.tsx` que solo componen JSX y no usan hooks de cliente.

---

## 4. Variables de entorno

Next inyecta variables en el bundle solo si empiezan con `NEXT_PUBLIC_`. Crea `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Y úsalo desde el código:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
```

> `.env.local` está ignorado por git por defecto. Para producción se configura en Vercel/Render/etc.

---

## 5. Tailwind v4 y tokens de diseño

Tailwind v4 ya **no usa `tailwind.config.js`**, todo va en CSS:

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --primary: #0f172a;
  --accent: #14b8a6;
  /* ... */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... */
}
```

Esto crea clases `bg-background`, `text-foreground`, etc. y centraliza los colores.

### Patrón `cn()` para combinar clases

`src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

¿Para qué sirve? Para que esto funcione bien:

```tsx
<button className={cn("px-4 py-2", isActive && "bg-blue-500", className)} />
```

`tailwind-merge` resuelve conflictos: si pones `"px-2"` y luego desde `className` mandas `"px-4"`, gana `"px-4"` (no se duplica).

---

## 6. Componentes UI propios (mini "shadcn")

En vez de instalar una librería, generamos pequeños componentes en `components/ui/`. Cada uno es ~30 líneas, así puedes leerlo y entender qué hace. La idea está copiada del enfoque de **shadcn/ui** (que también copia los archivos a tu repo).

Ejemplo, `Button`:

```tsx
"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 ...",
  // ...
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, ...props }, ref) => (
    <button ref={ref} disabled={props.disabled || loading}
      className={cn(/* ... */)} {...props}>
      {loading && <Spinner />}
      {props.children}
    </button>
  ),
);
```

Conceptos en juego:

- **`forwardRef`**: deja que el componente reciba un `ref` (útil si lo usas dentro de un `<form>` o necesitas focus programático).
- **`...props`**: difunde el resto de atributos HTML (`type`, `disabled`, `onClick`...).
- **`Record<Variant, string>`**: mapa fuertemente tipado de variante → clases Tailwind.

Componentes incluidos: `Button`, `Input`, `Label`, `Select`, `Textarea`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Alert`, `EmptyState`, `Spinner`, `Dialog`.

---

## 7. Cliente HTTP y manejo de errores

`src/lib/api.ts` envuelve `fetch`:

```ts
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message); this.status = status;
  }
}

export async function api<T>(path: string, options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body, cache: "no-store" });
  // ...
  if (!res.ok) throw new ApiError(message, res.status);
  return data as T;
}
```

Tres ideas:

1. **Generic `<T>`**: el llamador define qué espera. `api<Pet[]>("/pets")` y TypeScript ya sabe que el resultado es `Pet[]`.
2. **`tokenStore`**: pequeñísima abstracción sobre `localStorage`. Si mañana quieres pasar a cookies httpOnly, cambias solo este archivo.
3. **`ApiError` propio**: el componente puede hacer `if (err instanceof ApiError)` y mostrar `err.message`. Mucho más limpio que parsear strings.

> **Por qué no Axios:** porque `fetch` ya hace todo lo que necesitamos y querías aprender. Axios sería útil si quisieras interceptors avanzados, cancelación con `AbortController` integrada, etc. Cuando lo necesites, este wrapper se reescribe en 10 minutos con Axios.

---

## 8. Autenticación con Context + JWT

`src/lib/auth-context.tsx` expone:

```ts
const { user, loading, login, register, logout } = useAuth();
```

Ciclo de vida:

1. `<AuthProvider>` envuelve toda la app (en `app/layout.tsx`).
2. Al montarse, lee el usuario de `localStorage` (clave `canipet_user`) → así no se "deslogea" al recargar.
3. `login()` llama al `/auth/login`, guarda token + usuario, hace `router.push("/dashboard")`.
4. `logout()` borra todo y va a `/login`.

```tsx
useEffect(() => {
  const stored = window.localStorage.getItem(USER_KEY);
  if (stored) setUser(JSON.parse(stored));
  setLoading(false);
}, []);
```

> **`loading`** es importante: hasta que no termina la hidratación, no podemos decidir si redirigir o no. Sin esa bandera, la app rebotaría a `/login` aunque tuvieras sesión.

### Por qué `localStorage` y no cookies

- Más simple para aprender y probar.
- El backend ya espera `Authorization: Bearer ...` (no cookies).
- Limitación real: vulnerable a XSS. Para producción se recomienda cookie `httpOnly` + endpoint dedicado, pero eso requiere más andamiaje (CSRF, SSR de Next, etc.).

---

## 9. Protección de rutas y autorización por rol

`components/protected-route.tsx`:

```tsx
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (roles && !roles.includes(user.rol)) router.replace("/dashboard");
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.rol))) return <Spinner/>;
  return <>{children}</>;
}
```

Se usa en dos niveles:

- **Layout completo del dashboard:** `app/(dashboard)/layout.tsx` envuelve TODO con `<ProtectedRoute>` (sin `roles`) → basta con estar logueado.
- **Página específica:** `app/(dashboard)/agenda/page.tsx` envuelve su contenido con `<ProtectedRoute roles={["VETERINARIO","ADMIN"]}>` → además del login, exige rol.

> **Nota:** esta es protección **del lado del cliente**. La protección REAL la hace el backend con `JwtAuthGuard` y `RolesGuard`. Aquí sólo evitamos mostrar UI inútil.

---

## 10. Patrón de páginas con datos

Casi todas las pantallas siguen el mismo esqueleto. Entendelo una vez y leés cualquiera:

```tsx
"use client";

export default function PetsPage() {
  return (
    <ProtectedRoute roles={["USUARIO", "ADMIN"]}>
      <PetsScreen />
    </ProtectedRoute>
  );
}

function PetsScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setPets(await api<Pet[]>("/pets")); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (pets.length === 0) return <EmptyState ... />;
  return <Grid items={pets} />;
}
```

Tres estados que SIEMPRE manejas: **loading / error / empty / data**.

---

## 11. Formularios

Son formularios HTML controlados, sin librería extra:

```tsx
const [nombre, setNombre] = useState("");
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);

async function onSubmit(e: FormEvent) {
  e.preventDefault();
  setSaving(true); setError(null);
  try { await api("/pets", { method: "POST", body: { nombre } }); onSaved(); }
  catch (err) { setError(err instanceof ApiError ? err.message : "Error"); }
  finally { setSaving(false); }
}

<form onSubmit={onSubmit}>
  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
  <Button type="submit" loading={saving}>Guardar</Button>
</form>
```

Para proyectos grandes te conviene **react-hook-form + zod** (una librería de validación). Aquí no hace falta porque los DTOs ya validan en el back y el `<input required>` cubre lo básico.

---

## 12. Diálogos y confirmaciones

`components/ui/dialog.tsx` es un modal accesible mínimo (cierra con ESC y al click fuera). Lo usás así:

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onClose={() => setOpen(false)} title="Nueva mascota">
  <PetForm onSaved={() => setOpen(false)} />
</Dialog>
```

Para confirmaciones (eliminar, cancelar cita) uso `confirm()` nativo del navegador. Suficiente para un MVP; si quieres algo más bonito, hace 1 hora con un `<ConfirmDialog>` propio.

---

## 13. Conexión backend ↔ frontend (CORS)

Como front (`:3001`) y back (`:3000`) viven en orígenes distintos, el navegador exige que el back envíe headers CORS. Por eso en `back-canipet-api/src/main.ts` agregamos:

```ts
app.enableCors({
  origin: ['http://localhost:3001'],
  credentials: true,
});
```

Sin esto, te aparece en consola algo como _"Access to fetch... blocked by CORS policy"_ y todas las peticiones desde el navegador fallan, aunque desde Postman o `curl` funcionen perfecto.

> Si despliegas el front en otro dominio (ej. `https://canipet.app`), agrega ese origen al array.

---

## 14. Comandos útiles

```bash
# Levantar back y front (en dos terminales separadas)
cd back-canipet-api  && pnpm start:dev    # http://localhost:3000
cd front-canipet-web && pnpm dev          # http://localhost:3001

# Build de producción del front
pnpm build && pnpm start

# Linter
pnpm lint
```

---

## 15. Próximos pasos sugeridos

Cuando ya domines este front, en orden:

1. **Refactor a TanStack Query**: caché automática, refetch en background, loading states sin escribir `useState` manual.
2. **react-hook-form + zod** para formularios complejos (validación tipada cliente + servidor).
3. **Toasts globales** (ej. `sonner`) en lugar de `alert()`.
4. **Refresh tokens**: cuando el JWT expire, renovarlo silenciosamente.
5. **Cookies httpOnly** + Server Components para fetch en el servidor con autenticación segura.
6. **Tests** con Vitest + React Testing Library.
7. **Dark mode** (los tokens CSS ya están preparados).
8. **Internacionalización** con `next-intl` si planeas inglés/español.
9. **Deploy** a Vercel (front) + Render/Fly/Railway (back) — Vercel detecta Next.js automáticamente.

---

## 16. Mapa endpoints ↔ pantallas

| Endpoint backend | Pantalla(s) front |
|---|---|
| `POST /api/auth/register` | `/register` |
| `POST /api/auth/login` | `/login` |
| `GET /api/pets` | `/pets`, `/appointments/new` (selector) |
| `POST /api/pets` | `/pets` (modal) |
| `PATCH /api/pets/:id` | `/pets` (modal de edición) |
| `DELETE /api/pets/:id` | `/pets` (botón eliminar) |
| `GET /api/services?categoria=X` | `/services`, `/appointments/new` |
| `POST/PATCH/DELETE /api/services/...` | `/services` (admin) |
| `GET /api/vets` | `/appointments/new`, `/admin/vets` |
| `POST/PATCH/DELETE /api/vets/...` | `/admin/vets` (admin) |
| `POST /api/appointments` | `/appointments/new` |
| `GET /api/appointments/mine` | `/appointments` |
| `PATCH /api/appointments/:id/cancel` | `/appointments` (botón cancelar) |
| `GET /api/appointments/agenda?estado=X` | `/agenda` (vet/admin) |
| `PATCH /api/appointments/:id/status` | `/agenda` (atender / cancelar) |

---

## Cheatsheet de "qué archivo edito si quiero..."

| Quiero... | Archivo |
|---|---|
| Cambiar colores globales | `src/app/globals.css` (variables CSS) |
| Agregar un endpoint nuevo | Lo llamas con `api("/lo-que-sea")` desde la página |
| Cambiar URL del backend | `.env.local` (`NEXT_PUBLIC_API_URL`) |
| Agregar un link en el menú | `src/components/navbar.tsx` (array `links`) |
| Agregar un rol nuevo | `src/lib/types.ts` (`Role`) y backend |
| Crear una página nueva | `src/app/(dashboard)/mi-pagina/page.tsx` |
| Restringir página por rol | Envolver con `<ProtectedRoute roles={["ADMIN"]}>` |
| Modal/diálogo nuevo | Reusar `<Dialog>` de `components/ui/dialog.tsx` |
| Botón nuevo | Variante de `<Button>` (primary/secondary/ghost/outline/danger) |

¡Listo! Con esta guía y el código de `front-canipet-web/` deberías poder defender el proyecto y, lo más importante, **entender** por qué cada pieza está donde está. Cuando quieras dar el siguiente paso (TanStack Query, deploy, dark mode...), avísame y vamos.
