import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vets')
export class Vet {
  @PrimaryGeneratedColumn()
  id_veterinario: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 80 })
  especialidad: string;

  @Column({ length: 30, nullable: true })
  telefono?: string;

  @Column({ unique: true })
  id_usuario: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;
}
