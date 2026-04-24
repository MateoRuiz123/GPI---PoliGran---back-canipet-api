import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pet } from './entities/pet.entity';
import { Repository } from 'typeorm';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(@InjectRepository(Pet) private readonly repo: Repository<Pet>) {}

  create(userId: number, dto: CreatePetDto) {
    const pet = this.repo.create({ ...dto, id_usuario: userId });
    return this.repo.save(pet);
  }

  findAllByUser(userId: number) {
    return this.repo.find({ where: { id_usuario: userId } });
  }

  async findOneOwned(userId: number, id: number) {
    const pet = await this.repo.findOne({ where: { id_mascota: id } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.id_usuario !== userId) throw new ForbiddenException();
    return pet;
  }

  async update(userId: number, id: number, dto: UpdatePetDto) {
    const pet = await this.findOneOwned(userId, id);
    Object.assign(pet, dto);
    return this.repo.save(pet);
  }

  async remove(userId: number, id: number) {
    const pet = await this.findOneOwned(userId, id);
    await this.repo.remove(pet);
  }
}
