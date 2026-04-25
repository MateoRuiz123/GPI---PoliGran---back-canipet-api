/* ============================================================
 * Cliente HTTP minimalista alrededor de fetch.
 * - Agrega el header Authorization si hay token en localStorage.
 * - Lanza ApiError con el mensaje del backend cuando algo falla.
 * - Convierte la respuesta a JSON automáticamente.
 * ============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

const TOKEN_KEY = "canipet_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  /** Si es false, no manda Authorization (login/register). */
  auth?: boolean;
}

export async function api<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data?.message && Array.isArray(data.message)
        ? data.message.join(", ")
        : data?.message) ?? `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
