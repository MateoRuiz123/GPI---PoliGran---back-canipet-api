"use client";

import { Dog, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, api } from "@/lib/api";
import { Pet } from "@/lib/types";
import { PetFormDialog } from "./pet-form-dialog";

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
  const [editing, setEditing] = useState<Pet | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Pet[]>("/pets");
      setPets(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando mascotas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(pet: Pet) {
    if (!confirm(`¿Eliminar a ${pet.nombre}?`)) return;
    try {
      await api(`/pets/${pet.id_mascota}`, { method: "DELETE" });
      setPets((prev) => prev.filter((p) => p.id_mascota !== pet.id_mascota));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Mis mascotas"
        description="Registra las mascotas que vas a llevar a sus citas."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nueva mascota
          </Button>
        }
      />

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : pets.length === 0 ? (
        <EmptyState
          icon={<Dog className="h-10 w-10" />}
          title="Aún no tienes mascotas"
          description="Registra tu primer peludo para poder agendar citas."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Registrar mascota
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Card key={pet.id_mascota}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <Dog className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {pet.nombre}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {pet.raza} · {pet.edad}{" "}
                      {pet.edad === 1 ? "año" : "años"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(pet)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(pet)}
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

      <PetFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <PetFormDialog
        open={!!editing}
        pet={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}
