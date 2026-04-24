import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Repository } from 'typeorm';
import { PetsService } from 'src/pets/pets.service';
import { ServicesService } from 'src/services/services.service';
import { VetsService } from 'src/vets/vets.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { Role } from 'src/users/enums/role.enum';
import { ChangeStatusDto } from './dto/change-status.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly pets: PetsService,
    private readonly services: ServicesService,
    private readonly vets: VetsService,
  ) {}

  //* Caso de uso: agendarCita() del usuario dueño
  async create(userId: number, dto: CreateAppointmentDto) {
    //1. la mascota debe pertenecer al usuario
    await this.pets.findOneOwned(userId, dto.id_mascota);
    //2. El servicio debe existir
    await this.services.findOne(dto.id_servicio);
    //3. (Opcional) si seleccionó veterinario, debe existir
    if (dto.id_veterinario) await this.vets.findOne(dto.id_veterinario);

    //4. la fecha no puede ser en el pasado
    const target = new Date(`${dto.fecha}T${dto.hora}:00`);
    if (target.getTime() < Date.now())
      throw new BadRequestException('La fecha/hora no puede ser pasada');

    //5. verificarDisponibilidad: si hay veterinario, no debe tener otra cita
    // en el mismo slot. si no hay veterinarios aun, igual chequeamos
    // contra el mismo usuario para no duplicarse
    const conflict = await this.repo.findOne({
      where: dto.id_veterinario
        ? {
            id_veterinario: dto.id_veterinario,
            fecha: dto.fecha,
            hora: dto.hora,
            estado: AppointmentStatus.AGENDADA,
          }
        : {
            id_usuario: userId,
            fecha: dto.fecha,
            hora: dto.hora,
            estado: AppointmentStatus.AGENDADA,
          },
    });
    if (conflict) throw new ConflictException('Horario no disponible');

    const cita = this.repo.create({
      ...dto,
      id_usuario: userId,
      estado: AppointmentStatus.AGENDADA,
    });
    return this.repo.save(cita);
  }

  //El usuario consulta sus propias citas
  findMine(userId: number) {
    return this.repo.find({
      where: { id_usuario: userId },
      relations: ['mascota', 'servicio', 'veteriario'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });
  }

  // Vet/Admin: lista la agenda. Si es VETERINARIO, sólo las suyas
  async findAgenda(
    user: { id_usuario: number; rol: Role },
    estado?: AppointmentStatus,
  ) {
    const where: any = {};
    if (estado) where.estado = estado;

    if (user.rol === Role.VETERINARIO) {
      const vet = await this.vets.findByUserId(user.id_usuario);
      if (!vet) {
        throw new ForbiddenException('No estás registrado como veterinario');
      }
      where.id_veterinario = vet.id_veterinario;
    }

    return this.repo.find({
      where,
      relations: ['usuario', 'mascota', 'servicio', 'veterinario'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });
  }

  async findOne(id: number) {
    const cita = await this.repo.findOne({
      where: { id_cita: id },
      relations: ['usuario', 'mascota', 'servicio', 'veterinario'],
    });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    return cita;
  }

  // Casa de uso: cancelarCita() -- el dueño de la cita
  async cancelByOwner(userId: number, id: number) {
    const cita = await this.findOne(id);
    if (cita.id_usuario !== userId) throw new ForbiddenException();
    if (cita.estado !== AppointmentStatus.AGENDADA) {
      throw new BadRequestException('Sólo se pueden cancelar citas AGENDADAS');
    }
    cita.estado = AppointmentStatus.CANCELADA;
    return this.repo.save(cita);
  }

  // caso de uso: aceptarCita() / cancelarCita() del veterinario
  async changeStatusAsVet(
    user: { id_usuario: number; rol: Role },
    id: number,
    dto: ChangeStatusDto,
  ) {
    const cita = await this.findOne(id);

    let vetId = dto.id_veterinario;
    if (user.rol === Role.VETERINARIO) {
      const vet = await this.vets.findByUserId(user.id_usuario);
      if (!vet) {
        throw new ForbiddenException('No estás registrado como veterinario');
      }
      vetId = vet?.id_veterinario;
    }
    // Acepta = pasar a ATENDIDA y asignarse como veterinario
    if (dto.estado === AppointmentStatus.ATENDIDA) {
      if (cita.estado !== AppointmentStatus.AGENDADA) {
        throw new BadRequestException('Solo se pueden atender citas AGENDADAS');
      }
      cita.id_veterinario = vetId ?? cita.id_veterinario;
    }
    cita.estado = dto.estado;
    return this.repo.save(cita);
  }
}
