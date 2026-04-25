"use client";

import { CalendarDays, Check, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
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
import { Appointment, AppointmentStatus } from "@/lib/types";

const STATUSES: AppointmentStatus[] = ["AGENDADA", "ATENDIDA", "CANCELADA"];

export default function AgendaPage() {
  return (
    <ProtectedRoute roles={["VETERINARIO", "ADMIN"]}>
      <Screen />
    </ProtectedRoute>
  );
}

function Screen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<AppointmentStatus | "">("AGENDADA");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const path = filter
        ? `/appointments/agenda?estado=${filter}`
        : "/appointments/agenda";
      setItems(await api<Appointment[]>(path));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function changeStatus(a: Appointment, estado: AppointmentStatus) {
    const verb =
      estado === "ATENDIDA" ? "atender" : estado === "CANCELADA" ? "cancelar" : "actualizar";
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} esta cita?`))
      return;
    try {
      await api(`/appointments/${a.id_cita}/status`, {
        method: "PATCH",
        body: { estado },
      });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error actualizando");
    }
  }

  return (
    <>
      <PageHeader
        title="Agenda veterinaria"
        description="Citas asignadas a tu cuenta (o todas, si eres admin)."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Estado:</span>
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setFilter(e.target.value as AppointmentStatus | "")
          }
        >
          <option value="">Todas</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Sin citas"
          description="No hay citas con ese filtro."
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id_cita}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
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
                  {a.usuario?.correo && (
                    <p className="text-xs text-slate-400">
                      Dueño: {a.usuario.correo}
                    </p>
                  )}
                </div>

                {a.estado === "AGENDADA" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => changeStatus(a, "ATENDIDA")}
                    >
                      <Check className="h-4 w-4" />
                      Atender
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => changeStatus(a, "CANCELADA")}
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
