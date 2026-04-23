import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id_usuario: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ unique: true, length: 160 })
  correo: string;

  // El hash bcrypt no se devuelve nunca al cliente (se excluye en el service)
  @Column({ name: 'contrasena' })
  contrasena: string;

  @Column({ length: 30, nullable: true })
  telefono?: string;

  @Column({ type: 'enum', enum: Role, default: Role.USUARIO })
  rol: Role;

  @CreateDateColumn()
  created_at: Date;

  // Relaciones inversas (las definimos cuando creemos las otras entidades)
  // @OneToMany(() => Pet, (pet) => pet.usuario) mascotas: Pet[];
  // @OneToOne(() => Vet, (v) => v.usuario) veterinario?: Vet;
}
