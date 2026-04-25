import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVetDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MaxLength(80)
  especialidad: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  // id del usuario base (rol VETERINARIO) ya creado via /api/auth/register
  @IsInt()
  id_usuario: number;
}
