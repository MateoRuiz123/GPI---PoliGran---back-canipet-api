"use client";

import { CalendarDays, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, api } from "@/lib/api";
import {
  formatDate,
  formatTime,
  statusLabels,
  statusTones,
} from "@/lib/format";
import { Appointment } from "@/lib/types";

export default function AppointmentsPage() {
  return (
    <ProtectedRoute roles={["USUARIO", "ADMIN"]}>
      <Screen />
    </ProtectedRoute>
  );
}

function Screen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api<Appointment[]>("/appointments/mine"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCancel(a: Appointment) {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      await api(`/appointments/${a.id_cita}/cancel`, { method: "PATCH" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error cancelando");
    }
  }

  return (
    <>
      <PageHeader
        title="Mis citas"
        description="Tus próximas citas y su estado."
        action={
          <Link
            href="/appointments/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Agendar cita
          </Link>
        }
      />

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Aún no tienes citas"
          description="Agenda una cita para tu mascota."
          action={
            <Link href="/appointments/new">
              <Button>
                <Plus className="h-4 w-4" />
                Agendar cita
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id_cita}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTones[a.estado]}>
                      {statusLabels[a.estado]}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      #{a.id_cita}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {a.servicio?.nombre ?? `Servicio #${a.id_servicio}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.mascota?.nombre ?? `Mascota #${a.id_mascota}`} ·{" "}
                    {formatDate(a.fecha)} · {formatTime(a.hora)}
                  </p>
                  {a.veterinario?.nombre && (
                    <p className="text-xs text-slate-400">
                      Veterinario: {a.veterinario.nombre}
                    </p>
                  )}
                </div>
                {a.estado === "AGENDADA" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => onCancel(a)}
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
