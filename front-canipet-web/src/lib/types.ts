/* ============================================================
 * Tipos del dominio. Coinciden 1:1 con los DTOs del backend.
 * ============================================================ */

export type Role = "USUARIO" | "VETERINARIO" | "ADMIN";

export type ServiceCategory =
  | "SALUD"
  | "ESTETICA"
  | "NUTRICION"
  | "GUARDERIA"
  | "FUNERARIA";

export type AppointmentStatus = "AGENDADA" | "CANCELADA" | "ATENDIDA";

export interface SessionUser {
  id_usuario: number;
  correo: string;
  rol: Role;
}

export interface AuthResponse {
  access_token: string;
  usuario: SessionUser;
}

export interface User extends SessionUser {
  nombre: string;
  telefono?: string;
}

export interface Pet {
  id_mascota: number;
  nombre: string;
  raza: string;
  edad: number;
  id_usuario: number;
}

export interface Service {
  id_servicio: number;
  nombre: string;
  descripcion: string;
  categoria: ServiceCategory;
}

export interface Vet {
  id_veterinario: number;
  nombre: string;
  especialidad: string;
  telefono?: string;
  id_usuario: number;
}

export interface Appointment {
  id_cita: number;
  fecha: string;
  hora: string;
  estado: AppointmentStatus;
  id_usuario: number;
  id_mascota: number;
  id_servicio: number;
  id_veterinario?: number | null;
  mascota?: Pet;
  servicio?: Service;
  veterinario?: Vet | null;
  usuario?: User;
}
