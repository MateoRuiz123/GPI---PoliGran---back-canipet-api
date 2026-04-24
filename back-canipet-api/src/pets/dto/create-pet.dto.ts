import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MaxLength(80)
  nombre: string;

  @IsString()
  @MaxLength(80)
  raza: string;

  @IsInt()
  @Min(0)
  @Max(40)
  edad: number;
}
