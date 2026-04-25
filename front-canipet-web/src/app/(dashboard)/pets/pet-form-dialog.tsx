"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { Pet } from "@/lib/types";

interface PetFormDialogProps {
  open: boolean;
  pet?: Pet;
  onClose: () => void;
  onSaved: () => void;
}

export function PetFormDialog({ open, pet, onClose, onSaved }: PetFormDialogProps) {
  const [nombre, setNombre] = useState("");
  const [raza, setRaza] = useState("");
  const [edad, setEdad] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(pet?.nombre ?? "");
      setRaza(pet?.raza ?? "");
      setEdad(pet?.edad ?? "");
      setError(null);
    }
  }, [open, pet]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = { nombre, raza, edad: Number(edad) };
      if (pet) {
        await api(`/pets/${pet.id_mascota}`, { method: "PATCH", body });
      } else {
        await api("/pets", { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={pet ? "Editar mascota" : "Nueva mascota"}
      description={pet ? `Modifica los datos de ${pet.nombre}.` : "Cuéntanos sobre tu peludo."}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="raza">Raza</Label>
          <Input
            id="raza"
            required
            value={raza}
            onChange={(e) => setRaza(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edad">Edad (años)</Label>
          <Input
            id="edad"
            type="number"
            min={0}
            max={40}
            required
            value={edad}
            onChange={(e) =>
              setEdad(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {pet ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
