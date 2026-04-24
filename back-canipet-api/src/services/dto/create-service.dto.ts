import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ServiceCategory } from '../enums/service-category.enum';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsString()
  descripcion: string;

  @IsEnum(ServiceCategory)
  categoria: ServiceCategory;
}
