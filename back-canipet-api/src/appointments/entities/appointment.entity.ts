import { Pet } from 'src/pets/entities/pet.entity';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { Vet } from 'src/vets/entities/ver.entity';
import {
  Entity,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AppointmentStatus } from '../enums/appointment-status.enum';

@Entity('appointments')
@Unique('uq_vet_slot', ['id_veterinario', 'fecha', 'hora'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id_cita: number;

  @Column({ type: 'date' })
  fecha: string; // 'YYYY-MM-DD'

  @Column({ type: 'time' })
  hora: string; // 'HH:MM'

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.AGENDADA,
  })
  estado: AppointmentStatus;

  @Column() id_usuario: number;
  @Column() id_mascota: number;
  @Column() id_servicio: number;
  @Column({ nullable: true }) id_veterinario?: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Pet;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_servicio' })
  servicio: Service;

  @ManyToOne(() => Vet, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario?: Vet;

  @CreateDateColumn()
  created_at: Date;
}
