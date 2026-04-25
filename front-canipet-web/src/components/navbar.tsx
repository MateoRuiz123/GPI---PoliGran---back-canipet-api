"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dog, LogOut, PawPrint, ShieldCheck, Stethoscope, Users, Wrench } from "lucide-react";
import { Role } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Si está vacío, lo ven todos. */
  roles?: Role[];
}

const links: NavLink[] = [
  { href: "/dashboard", label: "Inicio", icon: PawPrint },
  { href: "/pets", label: "Mis mascotas", icon: Dog, roles: ["USUARIO", "ADMIN"] },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/appointments", label: "Mis citas", icon: CalendarDays, roles: ["USUARIO", "ADMIN"] },
  { href: "/agenda", label: "Agenda", icon: Stethoscope, roles: ["VETERINARIO", "ADMIN"] },
  { href: "/admin/users", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/vets", label: "Veterinarios", icon: ShieldCheck, roles: ["ADMIN"] },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const visible = links.filter((l) => !l.roles || l.roles.includes(user.rol));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-900"
        >
          <PawPrint className="h-5 w-5 text-teal-600" />
          <span className="text-base font-semibold tracking-tight">
            Canipet
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {visible.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-800">
              {user.correo}
            </p>
            <p className="text-xs leading-tight text-slate-500">
              {user.rol}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 md:hidden">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-sm",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
