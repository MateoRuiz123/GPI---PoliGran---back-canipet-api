import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { Vet } from './entities/vet.entity';

@Injectable()
export class VetsService {
  constructor(@InjectRepository(Vet) private readonly repo: Repository<Vet>) {}

  create(dto: CreateVetDto) {
    return this.repo.save(this.repo.create(dto));
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: number) {
    const v = await this.repo.findOne({ where: { id_veterinario: id } });
    if (!v) throw new NotFoundException('Veterinario no encontrado');
    return v;
  }

  findByUserId(id_usuario: number) {
    return this.repo.findOne({ where: { id_usuario } });
  }

  async update(id: number, dto: UpdateVetDto) {
    const v = await this.repo.preload({ id_veterinario: id, ...dto });
    if (!v) throw new NotFoundException('Veterinario no encontrado');
    return this.repo.save(v);
  }

  async remove(id: number) {
    const r = await this.repo.delete(id);
    if (!r.affected) throw new NotFoundException('Veterinario no encontrado');
  }
}
