import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export class ChangeStatusDto {
  @IsEnum(AppointmentStatus)
  estado: AppointmentStatus;

  @IsOptional()
  @IsInt()
  id_veterinario?: number;
}
