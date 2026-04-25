"use client";

import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, api } from "@/lib/api";
import { Vet } from "@/lib/types";
import { VetFormDialog } from "./vet-form-dialog";

export default function VetsAdminPage() {
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <Screen />
    </ProtectedRoute>
  );
}

function Screen() {
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vet | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setVets(await api<Vet[]>("/vets"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(v: Vet) {
    if (!confirm(`¿Eliminar al veterinario ${v.nombre}?`)) return;
    try {
      await api(`/vets/${v.id_veterinario}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Veterinarios"
        description="Crea perfiles veterinarios a partir de usuarios existentes."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nuevo veterinario
          </Button>
        }
      />

      <Alert tone="info" className="mb-4">
        <strong>Tip:</strong> primero crea el usuario base con rol{" "}
        <code className="rounded bg-white/60 px-1">VETERINARIO</code> desde{" "}
        <code className="rounded bg-white/60 px-1">/admin/users</code>, luego
        usa ese <code className="rounded bg-white/60 px-1">id_usuario</code>{" "}
        aquí para completar su ficha profesional.
      </Alert>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : vets.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-10 w-10" />}
          title="Sin veterinarios"
          description="Aún no hay veterinarios registrados."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vets.map((v) => (
            <Card key={v.id_veterinario}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {v.nombre}
                    </h3>
                    <p className="text-sm text-slate-500">{v.especialidad}</p>
                    {v.telefono && (
                      <p className="text-xs text-slate-400">{v.telefono}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(v)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(v)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VetFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <VetFormDialog
        open={!!editing}
        vet={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}
