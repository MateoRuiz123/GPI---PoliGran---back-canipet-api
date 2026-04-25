import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/users/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Por seguridad, el registro público SIEMPRE crea usuarios con rol USUARIO,
    // sin importar lo que mande el cliente. Para crear VETERINARIO/ADMIN
    // se debe usar POST /users (protegido para ADMIN).
    const u = await this.users.create({ ...dto, rol: Role.USUARIO });
    return this.signToken(u.id_usuario, u.correo, u.rol);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.correo);
    if (!user) throw new UnauthorizedException('Credenciales invalidas');

    const ok = await bcrypt.compare(dto.contrasena, user.contrasena);
    if (!ok) throw new UnauthorizedException('Credenciales invalidas');

    return this.signToken(user.id_usuario, user.correo, user.rol);
  }

  private async signToken(sub: number, correo: string, rol: any) {
    const p: JwtPayload = { sub, correo, rol };
    return {
      access_token: await this.jwt.signAsync(p),
      usuario: { id_usuario: sub, correo, rol },
    };
  }
}
