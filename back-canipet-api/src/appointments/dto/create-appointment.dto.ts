import { IsInt, IsOptional, IsDateString, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  id_mascota: number;

  @IsInt()
  id_servicio: number;

  @IsOptional()
  @IsInt()
  id_veterinario?: number;

  @IsDateString()
  fecha: string; // '2026-05-10'

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora debe tener formato HH:MM',
  })
  hora: string; // '14:30'
}
