import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceCategory } from './enums/service-category.enum';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
  ) {}

  create(dto: CreateServiceDto) {
    return this.repo.save(dto);
  }

  findAll(categoria?: ServiceCategory) {
    return categoria
      ? this.repo.find({ where: { categoria } })
      : this.repo.find();
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id_servicio: id } });
    if (!s) throw new NotFoundException('Servicio no encotrado');
    return s;
  }

  async update(id: number, dto: UpdateServiceDto) {
    const s = await this.repo.preload({ id_servicio: id, ...dto });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return this.repo.save(s);
  }

  async remove(id: number) {
    const r = await this.repo.delete(id);
    if (!r.affected) throw new NotFoundException('Servicio no encontrado');
  }
}
