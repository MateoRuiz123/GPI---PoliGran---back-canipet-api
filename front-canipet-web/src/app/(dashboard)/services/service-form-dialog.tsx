"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api";
import { categoryLabels } from "@/lib/format";
import { Service, ServiceCategory } from "@/lib/types";

const CATEGORIES: ServiceCategory[] = [
  "SALUD",
  "ESTETICA",
  "NUTRICION",
  "GUARDERIA",
  "FUNERARIA",
];

interface ServiceFormDialogProps {
  open: boolean;
  service?: Service;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceFormDialog({
  open,
  service,
  onClose,
  onSaved,
}: ServiceFormDialogProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<ServiceCategory>("SALUD");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(service?.nombre ?? "");
      setDescripcion(service?.descripcion ?? "");
      setCategoria(service?.categoria ?? "SALUD");
      setError(null);
    }
  }, [open, service]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = { nombre, descripcion, categoria };
      if (service) {
        await api(`/services/${service.id_servicio}`, {
          method: "PATCH",
          body,
        });
      } else {
        await api("/services", { method: "POST", body });
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
      title={service ? "Editar servicio" : "Nuevo servicio"}
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
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Select
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as ServiceCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {service ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
