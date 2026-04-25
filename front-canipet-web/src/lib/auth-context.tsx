"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStore } from "./api";
import { AuthResponse, SessionUser } from "./types";

interface LoginInput {
  correo: string;
  contrasena: string;
}

interface RegisterInput extends LoginInput {
  nombre: string;
  telefono?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "canipet_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidratar el usuario al montar (SSR-safe)
  useEffect(() => {
    const stored = window.localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored) as SessionUser);
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((res: AuthResponse) => {
    tokenStore.set(res.access_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    setUser(res.usuario);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: input,
        auth: false,
      });
      persist(res);
      router.push("/dashboard");
    },
    [persist, router],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: input,
        auth: false,
      });
      persist(res);
      router.push("/dashboard");
    },
    [persist, router],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
