import { AppointmentStatus, ServiceCategory } from "./types";

export const categoryLabels: Record<ServiceCategory, string> = {
  SALUD: "Salud",
  ESTETICA: "Estética",
  NUTRICION: "Nutrición",
  GUARDERIA: "Guardería",
  FUNERARIA: "Funeraria",
};

export const categoryTones: Record<
  ServiceCategory,
  "info" | "success" | "warning" | "danger" | "neutral"
> = {
  SALUD: "info",
  ESTETICA: "warning",
  NUTRICION: "success",
  GUARDERIA: "neutral",
  FUNERARIA: "danger",
};

export const statusLabels: Record<AppointmentStatus, string> = {
  AGENDADA: "Agendada",
  CANCELADA: "Cancelada",
  ATENDIDA: "Atendida",
};

export const statusTones: Record<
  AppointmentStatus,
  "info" | "success" | "danger"
> = {
  AGENDADA: "info",
  CANCELADA: "danger",
  ATENDIDA: "success",
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(time: string): string {
  // backend devuelve "HH:MM:SS" o "HH:MM"
  return time.slice(0, 5);
}
