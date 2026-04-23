import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.repo.findOne({ where: { correo: dto.correo } });
    if (exists) throw new ConflictException('El correo ya existe');

    const hash = await bcrypt.hash(dto.contrasena, 10);
    const user = this.repo.create({ ...dto, contrasena: hash });
    return this.sanitize(await this.repo.save(user));
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id_usuario: id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
  }

  // Para uso internos del módulo auth (necesita hash)
  findByEmailWithPassword(correo: string) {
    return this.repo.findOne({ where: { correo } });
  }

  async update(id: number, dto: UpdateUserDto) {
    const u = await this.repo.preload({ id_usuario: id, ...dto });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (dto.contrasena) u.contrasena = await bcrypt.hash(dto.contrasena, 10);
    return this.sanitize(await this.repo.save(u));
  }

  async remove(id: number) {
    const r = await this.repo.delete(id);
    if (!r.affected) throw new NotFoundException('Usuario no encontrado');
  }

  private sanitize(user: User): User {
    const { contrasena, ...safe } = user;
    return safe as User;
  }
}
