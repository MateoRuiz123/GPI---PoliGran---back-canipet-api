"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError, api } from "@/lib/api";
import { Role, User } from "@/lib/types";

interface UserFormDialogProps {
  open: boolean;
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: { value: Role; label: string }[] = [
  { value: "USUARIO", label: "Usuario (cliente)" },
  { value: "VETERINARIO", label: "Veterinario" },
  { value: "ADMIN", label: "Administrador" },
];

export function UserFormDialog({
  open,
  user,
  onClose,
  onSaved,
}: UserFormDialogProps) {
  const isEdit = !!user;

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rol, setRol] = useState<Role>("USUARIO");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(user?.nombre ?? "");
      setCorreo(user?.correo ?? "");
      setTelefono(user?.telefono ?? "");
      setRol(user?.rol ?? "USUARIO");
      setContrasena("");
      setError(null);
    }
  }, [open, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          nombre,
          correo,
          telefono: telefono || undefined,
          rol,
        };
        if (contrasena.trim().length > 0) body.contrasena = contrasena;
        await api(`/users/${user!.id_usuario}`, { method: "PATCH", body });
      } else {
        await api("/users", {
          method: "POST",
          body: {
            nombre,
            correo,
            telefono: telefono || undefined,
            contrasena,
            rol,
          },
        });
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
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      description={
        isEdit
          ? "Deja la contraseña en blanco si no quieres cambiarla."
          : "El usuario podrá iniciar sesión inmediatamente con estas credenciales."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="space-y-1.5">
          <Label htmlFor="u-nombre">Nombre</Label>
          <Input
            id="u-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-correo">Correo</Label>
          <Input
            id="u-correo"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-telefono">Teléfono</Label>
          <Input
            id="u-telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-contrasena">
            Contraseña {isEdit && <span className="text-slate-400">(opcional)</span>}
          </Label>
          <Input
            id="u-contrasena"
            type="password"
            minLength={6}
            required={!isEdit}
            placeholder={isEdit ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-rol">Rol</Label>
          <Select
            id="u-rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
