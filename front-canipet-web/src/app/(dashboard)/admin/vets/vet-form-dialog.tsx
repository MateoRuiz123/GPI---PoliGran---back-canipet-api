"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { Vet } from "@/lib/types";

interface VetFormDialogProps {
  open: boolean;
  vet?: Vet;
  onClose: () => void;
  onSaved: () => void;
}

export function VetFormDialog({ open, vet, onClose, onSaved }: VetFormDialogProps) {
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idUsuario, setIdUsuario] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(vet?.nombre ?? "");
      setEspecialidad(vet?.especialidad ?? "");
      setTelefono(vet?.telefono ?? "");
      setIdUsuario(vet?.id_usuario ?? "");
      setError(null);
    }
  }, [open, vet]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        nombre,
        especialidad,
        telefono: telefono || undefined,
        id_usuario: Number(idUsuario),
      };
      if (vet) {
        await api(`/vets/${vet.id_veterinario}`, { method: "PATCH", body });
      } else {
        await api("/vets", { method: "POST", body });
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
      title={vet ? "Editar veterinario" : "Nuevo veterinario"}
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
          <Label htmlFor="especialidad">Especialidad</Label>
          <Input
            id="especialidad"
            required
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="id_usuario">ID de usuario base</Label>
          <Input
            id="id_usuario"
            type="number"
            min={1}
            required
            value={idUsuario}
            onChange={(e) =>
              setIdUsuario(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            disabled={!!vet}
          />
          <p className="text-xs text-slate-400">
            El usuario debe existir y tener rol VETERINARIO.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {vet ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
