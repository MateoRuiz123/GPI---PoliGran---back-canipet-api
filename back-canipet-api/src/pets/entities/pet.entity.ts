import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn()
  id_mascota: number;

  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 80 })
  raza: string;

  @Column({ type: 'int' })
  edad: number;

  @Column()
  id_usuario: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;
}
