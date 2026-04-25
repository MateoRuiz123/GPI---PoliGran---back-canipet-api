"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { Role, User } from "@/lib/types";
import { UserFormDialog } from "./user-form-dialog";

export default function UsersAdminPage() {
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <Screen />
    </ProtectedRoute>
  );
}

const ROLE_TONE: Record<Role, "info" | "success" | "warning"> = {
  USUARIO: "info",
  VETERINARIO: "success",
  ADMIN: "warning",
};

function Screen() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api<User[]>("/users"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(u: User) {
    if (u.id_usuario === me?.id_usuario) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!confirm(`¿Eliminar al usuario ${u.correo}?`)) return;
    try {
      await api(`/users/${u.id_usuario}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Crea y administra usuarios con cualquier rol del sistema."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      <Alert tone="info" className="mb-4">
        Para crear un perfil de veterinario primero crea aquí el usuario con rol{" "}
        <code className="rounded bg-white/60 px-1">VETERINARIO</code> y luego
        ve a <code className="rounded bg-white/60 px-1">/admin/vets</code> para
        completar su ficha profesional.
      </Alert>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Sin usuarios"
          description="Aún no hay usuarios registrados."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id_usuario} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">
                        #{u.id_usuario}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {u.nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.correo}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {u.telefono || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ROLE_TONE[u.rol]}>{u.rol}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(u)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(u)}
                            disabled={u.id_usuario === me?.id_usuario}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <UserFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <UserFormDialog
        open={!!editing}
        user={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}
