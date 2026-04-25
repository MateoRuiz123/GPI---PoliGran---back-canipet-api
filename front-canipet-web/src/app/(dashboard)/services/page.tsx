"use client";

import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { ApiError, api } from "@/lib/api";
import { categoryLabels, categoryTones } from "@/lib/format";
import { Service, ServiceCategory } from "@/lib/types";
import { ServiceFormDialog } from "./service-form-dialog";

const CATEGORIES: ServiceCategory[] = [
  "SALUD",
  "ESTETICA",
  "NUTRICION",
  "GUARDERIA",
  "FUNERARIA",
];

export default function ServicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState<ServiceCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const path = filter ? `/services?categoria=${filter}` : "/services";
      setServices(await api<Service[]>(path));
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

  async function onDelete(s: Service) {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"?`)) return;
    try {
      await api(`/services/${s.id_servicio}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Catálogo de servicios"
        description="Salud, estética, nutrición, guardería y más."
        action={
          isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Filtrar por categoría:</span>
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setFilter(e.target.value as ServiceCategory | "")
          }
        >
          <option value="">Todas</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-10 w-10" />}
          title="Sin servicios"
          description={
            filter
              ? "No hay servicios en esta categoría."
              : "Aún no hay servicios registrados."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id_servicio}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {s.nombre}
                  </h3>
                  <Badge tone={categoryTones[s.categoria]}>
                    {categoryLabels[s.categoria]}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{s.descripcion}</p>
                {isAdmin && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDelete(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <ServiceFormDialog
        open={!!editing}
        service={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}
