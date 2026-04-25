"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, api } from "@/lib/api";
import { categoryLabels } from "@/lib/format";
import { Pet, Service, Vet } from "@/lib/types";

export default function NewAppointmentPage() {
  return (
    <ProtectedRoute roles={["USUARIO", "ADMIN"]}>
      <Screen />
    </ProtectedRoute>
  );
}

function Screen() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [petId, setPetId] = useState<number | "">("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [vetId, setVetId] = useState<number | "">("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s, v] = await Promise.all([
          api<Pet[]>("/pets"),
          api<Service[]>("/services"),
          api<Vet[]>("/vets"),
        ]);
        setPets(p);
        setServices(s);
        setVets(v);
        if (p[0]) setPetId(p[0].id_mascota);
        if (s[0]) setServiceId(s[0].id_servicio);
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : "Error cargando datos",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/appointments", {
        method: "POST",
        body: {
          id_mascota: Number(petId),
          id_servicio: Number(serviceId),
          id_veterinario: vetId === "" ? undefined : Number(vetId),
          fecha,
          hora,
        },
      });
      router.push("/appointments");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al agendar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (loadError) {
    return <Alert tone="error">{loadError}</Alert>;
  }

  if (pets.length === 0) {
    return (
      <Alert tone="info">
        Necesitas registrar al menos una mascota antes de agendar una cita.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="Agendar cita"
        description="Selecciona mascota, servicio y horario."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Nueva cita</CardTitle>
          <CardDescription>Todos los campos son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            <div className="space-y-1.5">
              <Label htmlFor="pet">Mascota</Label>
              <Select
                id="pet"
                value={petId}
                onChange={(e) => setPetId(Number(e.target.value))}
                required
              >
                {pets.map((p) => (
                  <option key={p.id_mascota} value={p.id_mascota}>
                    {p.nombre} ({p.raza})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service">Servicio</Label>
              <Select
                id="service"
                value={serviceId}
                onChange={(e) => setServiceId(Number(e.target.value))}
                required
              >
                {services.map((s) => (
                  <option key={s.id_servicio} value={s.id_servicio}>
                    {categoryLabels[s.categoria]} — {s.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vet">Veterinario (opcional)</Label>
              <Select
                id="vet"
                value={vetId}
                onChange={(e) =>
                  setVetId(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="">Cualquiera</option>
                {vets.map((v) => (
                  <option key={v.id_veterinario} value={v.id_veterinario}>
                    {v.nombre} — {v.especialidad}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="time"
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={submitting}>
                Agendar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
