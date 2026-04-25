"use client";

import Link from "next/link";
import {
  CalendarDays,
  Dog,
  ShieldCheck,
  Stethoscope,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";

interface Tile {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  roles?: Role[];
}

const tiles: Tile[] = [
  {
    href: "/pets",
    label: "Mis mascotas",
    description: "Registra y administra tus peluditos.",
    icon: Dog,
    roles: ["USUARIO", "ADMIN"],
  },
  {
    href: "/services",
    label: "Catálogo de servicios",
    description: "Consulta los servicios disponibles.",
    icon: Wrench,
  },
  {
    href: "/appointments",
    label: "Mis citas",
    description: "Agenda y consulta tus próximas citas.",
    icon: CalendarDays,
    roles: ["USUARIO", "ADMIN"],
  },
  {
    href: "/agenda",
    label: "Agenda veterinaria",
    description: "Atiende o cancela citas asignadas.",
    icon: Stethoscope,
    roles: ["VETERINARIO", "ADMIN"],
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    description: "Crea y administra usuarios y roles.",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/vets",
    label: "Veterinarios",
    description: "Gestiona los perfiles veterinarios.",
    icon: ShieldCheck,
    roles: ["ADMIN"],
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const visible = tiles.filter((t) => !t.roles || t.roles.includes(user.rol));

  return (
    <>
      <PageHeader
        title={`¡Hola${user.correo ? `, ${user.correo.split("@")[0]}` : ""}!`}
        description="¿Qué quieres hacer hoy?"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
