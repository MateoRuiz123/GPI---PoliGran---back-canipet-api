"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";
import { Spinner } from "./ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Si se omite, basta con estar logueado. */
  roles?: Role[];
}

/**
 * Protege el subárbol: si no hay sesión envía a /login,
 * si el rol no está permitido envía a /dashboard.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.rol)) {
      router.replace("/dashboard");
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.rol))) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return <>{children}</>;
}
