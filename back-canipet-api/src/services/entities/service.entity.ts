import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceCategory } from '../enums/service-category.enum';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id_servicio: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: ServiceCategory })
  categoria: ServiceCategory;
}
