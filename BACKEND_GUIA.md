# Guía paso a paso: Backend en NestJS + PostgreSQL

Sistema de Atención Preventiva y Correctiva de Caninos
(Basado en los diagramas `diagrama_clases.puml`, `diagrama_secuencia.puml` y `diagrama_secuencia_veterinario.puml`)

---

## Tabla de contenido

1. [Stack y decisiones técnicas](#1-stack-y-decisiones-técnicas)
2. [Prerequisitos](#2-prerequisitos)
3. [Crear el proyecto NestJS](#3-crear-el-proyecto-nestjs)
4. [Levantar PostgreSQL con Docker](#4-levantar-postgresql-con-docker)
5. [Variables de entorno y `ConfigModule`](#5-variables-de-entorno-y-configmodule)
6. [Conexión a la base de datos con TypeORM](#6-conexión-a-la-base-de-datos-con-typeorm)
7. [Validación global y prefijo `/api`](#7-validación-global-y-prefijo-api)
8. [Módulo `users` (entidad Usuario)](#8-módulo-users-entidad-usuario)
9. [Módulo `auth` (registro, login, JWT, roles)](#9-módulo-auth-registro-login-jwt-roles)
10. [Módulo `pets` (Mascotas)](#10-módulo-pets-mascotas)
11. [Módulo `services` (Catálogo de servicios)](#11-módulo-services-catálogo-de-servicios)
12. [Módulo `vets` (Veterinarios)](#12-módulo-vets-veterinarios)
13. [Módulo `appointments` (Citas) — reglas de negocio](#13-módulo-appointments-citas)
14. [Documentación con Swagger](#14-documentación-con-swagger)
15. [Seed de datos iniciales](#15-seed-de-datos-iniciales)
16. [Probar todo con `curl`](#16-probar-todo-con-curl)
17. [Próximos pasos](#17-próximos-pasos)

---

## 1. Stack y decisiones técnicas

| Pieza         | Elección                                | Por qué                                                                                        |
| ------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Framework     | **NestJS** (TypeScript)                 | Lo que querés aprender. Arquitectura modular, decoradores, DI.                                 |
| ORM           | **TypeORM**                             | Es el ORM "canónico" en la documentación oficial de Nest, encaja con el estilo de decoradores. |
| Base de datos | **PostgreSQL 16**                       | Lo que pediste. La corremos en Docker para no ensuciar tu sistema.                             |
| Auth          | **JWT + Passport** + **bcrypt**         | Estándar, compatible con tu diagrama (token devuelto al iniciar sesión).                       |
| Validación    | **class-validator + class-transformer** | DTOs validados automáticamente.                                                                |
| Docs API      | **Swagger** (`@nestjs/swagger`)         | Para probar endpoints desde el navegador.                                                      |
| Contenedores  | **Docker Compose** (sólo Postgres)      | El backend lo corremos con `npm run start:dev` para iterar rápido.                             |

> **Convenio de nombres:** uso nombres en inglés para entidades/archivos (`User`, `Pet`, `Appointment`...) porque es lo más común en proyectos Nest, pero los **valores** del dominio (roles, estados, categorías) los dejo iguales a tu diagrama (`USUARIO`, `AGENDADA`, etc.).

---

## 2. Prerequisitos

Verifica que tengas instalado:

```bash
node -v        # v20 o superior
npm -v         # v10+
docker -v      # 24+
docker compose version
```

Si no tienes Node 20+, te recomiendo `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# reabre la terminal
nvm install 20
nvm use 20
```

Instala el CLI de Nest globalmente (te dará el comando `nest`):

```bash
npm i -g @nestjs/cli
```

---

## 3. Crear el proyecto NestJS

Desde la carpeta `GPI - PoliGran/`:

```bash
nest new backend --package-manager npm --strict
```

Responde lo que te pida y cuando termine:

```bash
cd backend
npm run start:dev
```

Abre `http://localhost:3000` → debe responder `Hello World!`. Cierra con `Ctrl+C`.

### Estructura inicial que verás

```
backend/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts          ← módulo raíz
│   ├── app.service.ts
│   └── main.ts                ← bootstrap
├── test/
├── nest-cli.json
├── package.json
└── tsconfig.json
```

> **Concepto Nest #1:** Todo en Nest gira alrededor de **módulos**. Un módulo agrupa controladores (HTTP), providers (servicios/lógica) y puede importar otros módulos.

### Instalar dependencias que vamos a usar

```bash
npm i @nestjs/config @nestjs/typeorm typeorm pg \
      @nestjs/passport passport passport-jwt @nestjs/jwt \
      bcrypt class-validator class-transformer \
      @nestjs/swagger

npm i -D @types/passport-jwt @types/bcrypt
```

---

## 4. Levantar PostgreSQL con Docker

En la **raíz del repo** (no dentro de `backend/`) crea `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: gpi_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: gpi_user
      POSTGRES_PASSWORD: gpi_pass
      POSTGRES_DB: gpi_db
    ports:
      - '5432:5432'
    volumes:
      - gpi_pg_data:/var/lib/postgresql/data

volumes:
  gpi_pg_data:
```

Levántalo:

```bash
docker compose up -d
docker compose ps          # debe mostrarlo "running"
docker compose logs -f postgres   # Ctrl+C para salir
```

Probar conexión rápida (opcional, requiere `psql`):

```bash
docker exec -it gpi_postgres psql -U gpi_user -d gpi_db -c "select version();"
```

---

## 5. Variables de entorno y `ConfigModule`

Dentro de `backend/`, crea `.env`:

```bash
# ----- App -----
NODE_ENV=development
PORT=3000

# ----- DB -----
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=gpi_user
DB_PASSWORD=gpi_pass
DB_NAME=gpi_db

# ----- JWT -----
JWT_SECRET=cambia-esto-por-algo-largo-y-aleatorio
JWT_EXPIRES_IN=1d
```

Y crea `.env.example` (igual pero sin secretos reales) para tu repo.

Agrega `.env` a `.gitignore` (ya viene incluido por defecto en Nest, pero verifica).

---

## 6. Conexión a la base de datos con TypeORM

Edita `src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

> **`synchronize: true`** crea/actualiza las tablas automáticamente leyendo tus entidades. **Solo en desarrollo.** En producción se usan migraciones.

Borra `app.controller.ts`, `app.service.ts` y sus imports/spec — no los necesitamos.

Reinicia `npm run start:dev`. Si conecta bien, verás algo como `Nest application successfully started`.

---

## 7. Validación global y prefijo `/api`

Edita `src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta props no definidas en el DTO
      forbidNonWhitelisted: true,
      transform: true, // convierte tipos (string→number, etc.)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> Ahora todos los endpoints viven bajo `/api/...` y los DTOs se validan automáticamente.

---

## 8. Módulo `users` (entidad Usuario)

Genera el módulo con el CLI:

```bash
nest g module users
nest g service users --no-spec
nest g controller users --no-spec
```

Esto crea `src/users/{users.module.ts, users.service.ts, users.controller.ts}`.

### 8.1 Enum de rol

`src/users/enums/role.enum.ts`:

```ts
export enum Role {
  USUARIO = 'USUARIO',
  VETERINARIO = 'VETERINARIO',
  ADMIN = 'ADMIN',
}
```

### 8.2 Entidad `User`

`src/users/entities/user.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
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

  // El hash bcrypt no se devuelve nunca al cliente (lo excluimos en el service)
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
```

### 8.3 DTOs

`src/users/dto/create-user.dto.ts`:

```ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEnum(Role)
  rol?: Role;
}
```

`src/users/dto/update-user.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

> Si te falta `@nestjs/mapped-types`: `npm i @nestjs/mapped-types`.

### 8.4 Service

`src/users/users.service.ts`:

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.repo.findOne({ where: { correo: dto.correo } });
    if (exists) throw new ConflictException('El correo ya está registrado');

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
    return this.sanitize(user);
  }

  /** Para uso interno del módulo auth (necesita el hash). */
  findByEmailWithPassword(correo: string) {
    return this.repo.findOne({ where: { correo } });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.repo.preload({ id_usuario: id, ...dto });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.contrasena) user.contrasena = await bcrypt.hash(dto.contrasena, 10);
    return this.sanitize(await this.repo.save(user));
  }

  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Usuario no encontrado');
  }

  private sanitize(user: User): User {
    const { contrasena, ...safe } = user;
    return safe as User;
  }
}
```

### 8.5 Controller

`src/users/users.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id);
  }
}
```

### 8.6 `users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // lo necesita el módulo auth
})
export class UsersModule {}
```

Asegúrate de importarlo en `AppModule`:

```ts
imports: [, /* ...lo de antes... */ UsersModule];
```

Reinicia el server. La tabla `users` debe crearse automáticamente. Verifica:

```bash
docker exec -it gpi_postgres psql -U gpi_user -d gpi_db -c "\dt"
```

---

## 9. Módulo `auth` (registro, login, JWT, roles)

```bash
nest g module auth
nest g service auth --no-spec
nest g controller auth --no-spec
```

### 9.1 DTOs

`src/auth/dto/login.dto.ts`:

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;
}
```

`src/auth/dto/register.dto.ts`:

```ts
import { CreateUserDto } from '../../users/dto/create-user.dto';
export class RegisterDto extends CreateUserDto {}
```

### 9.2 Estrategia JWT

`src/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../users/enums/role.enum';

export interface JwtPayload {
  sub: number; // id_usuario
  correo: string;
  rol: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  // Lo que retornes acá queda disponible como `request.user`
  validate(payload: JwtPayload) {
    return {
      id_usuario: payload.sub,
      correo: payload.correo,
      rol: payload.rol,
    };
  }
}
```

### 9.3 Guard JWT y guard de roles

`src/auth/guards/jwt-auth.guard.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`src/auth/decorators/roles.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`src/auth/guards/roles.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../users/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
```

Decorador útil para sacar el usuario actual:

`src/auth/decorators/current-user.decorator.ts`:

```ts
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);
```

### 9.4 Service

`src/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create(dto);
    return this.signToken(user.id_usuario, user.correo, user.rol);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.correo);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.contrasena, user.contrasena);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return this.signToken(user.id_usuario, user.correo, user.rol);
  }

  private async signToken(sub: number, correo: string, rol: any) {
    const payload: JwtPayload = { sub, correo, rol };
    return {
      access_token: await this.jwt.signAsync(payload),
      usuario: { id_usuario: sub, correo, rol },
    };
  }
}
```

### 9.5 Controller

`src/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
```

### 9.6 `auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
```

Importa `AuthModule` en `AppModule`.

> **Concepto Nest #2:** Los **Guards** se ejecutan antes del handler y deciden si la request continúa. `JwtAuthGuard` valida el token; `RolesGuard` valida el rol. Se combinan con `@UseGuards(JwtAuthGuard, RolesGuard)`.

---

## 10. Módulo `pets` (Mascotas)

```bash
nest g module pets
nest g service pets --no-spec
nest g controller pets --no-spec
```

### 10.1 Entidad

`src/pets/entities/pet.entity.ts`:

```ts
import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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
```

### 10.2 DTOs

`src/pets/dto/create-pet.dto.ts`:

```ts
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MaxLength(80)
  nombre: string;

  @IsString()
  @MaxLength(80)
  raza: string;

  @IsInt()
  @Min(0)
  @Max(40)
  edad: number;
}
```

`src/pets/dto/update-pet.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePetDto } from './create-pet.dto';
export class UpdatePetDto extends PartialType(CreatePetDto) {}
```

### 10.3 Service

`src/pets/pets.service.ts`:

```ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './entities/pet.entity';

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
```

### 10.4 Controller (todo protegido con JWT)

`src/pets/pets.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetsService } from './pets.service';

@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePetDto) {
    return this.pets.create(user.id_usuario, dto);
  }

  @Get()
  findMine(@CurrentUser() user: any) {
    return this.pets.findAllByUser(user.id_usuario);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.pets.findOneOwned(user.id_usuario, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePetDto,
  ) {
    return this.pets.update(user.id_usuario, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.pets.remove(user.id_usuario, id);
  }
}
```

### 10.5 Module

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pet } from './entities/pet.entity';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pet])],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
```

Importa `PetsModule` en `AppModule`.

---

## 11. Módulo `services` (Catálogo de servicios)

> En tu diagrama el catálogo es público (cualquier usuario logueado lo consulta) y solo `ADMIN` lo administra.

```bash
nest g module services
nest g service services --no-spec
nest g controller services --no-spec
```

### 11.1 Enum y entidad

`src/services/enums/service-category.enum.ts`:

```ts
export enum ServiceCategory {
  SALUD = 'SALUD',
  ESTETICA = 'ESTETICA',
  NUTRICION = 'NUTRICION',
  GUARDERIA = 'GUARDERIA',
  FUNERARIA = 'FUNERARIA',
}
```

`src/services/entities/service.entity.ts`:

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceCategory } from '../enums/service-category.enum';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id_servicio: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: ServiceCategory })
  categoria: ServiceCategory;
}
```

### 11.2 DTOs

`src/services/dto/create-service.dto.ts`:

```ts
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { ServiceCategory } from '../enums/service-category.enum';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsString()
  descripcion: string;

  @IsEnum(ServiceCategory)
  categoria: ServiceCategory;
}
```

`src/services/dto/update-service.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
```

### 11.3 Service

`src/services/services.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceCategory } from './enums/service-category.enum';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
  ) {}

  create(dto: CreateServiceDto) {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(categoria?: ServiceCategory) {
    return categoria
      ? this.repo.find({ where: { categoria } })
      : this.repo.find();
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id_servicio: id } });
    if (!s) throw new NotFoundException('Servicio no encontrado');
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
```

### 11.4 Controller (con roles)

`src/services/services.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceCategory } from './enums/service-category.enum';
import { ServicesService } from './services.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  findAll(@Query('categoria') categoria?: ServiceCategory) {
    return this.services.findAll(categoria);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.services.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.services.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceDto) {
    return this.services.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.services.remove(id);
  }
}
```

### 11.5 Module

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
```

Importa `ServicesModule` en `AppModule`.

---

## 12. Módulo `vets` (Veterinarios)

```bash
nest g module vets
nest g service vets --no-spec
nest g controller vets --no-spec
```

### 12.1 Entidad

`src/vets/entities/vet.entity.ts`:

```ts
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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
```

### 12.2 DTOs

`src/vets/dto/create-vet.dto.ts`:

```ts
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVetDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MaxLength(80)
  especialidad: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  /** Id del usuario base (rol VETERINARIO) ya creado vía /api/auth/register */
  @IsInt()
  id_usuario: number;
}
```

`src/vets/dto/update-vet.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateVetDto } from './create-vet.dto';
export class UpdateVetDto extends PartialType(CreateVetDto) {}
```

### 12.3 Service

`src/vets/vets.service.ts`:

```ts
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
```

### 12.4 Controller

`src/vets/vets.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { VetsService } from './vets.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vets')
export class VetsController {
  constructor(private readonly vets: VetsService) {}

  @Get()
  findAll() {
    return this.vets.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vets.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateVetDto) {
    return this.vets.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVetDto) {
    return this.vets.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vets.remove(id);
  }
}
```

### 12.5 Module

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vet } from './entities/vet.entity';
import { VetsController } from './vets.controller';
import { VetsService } from './vets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vet])],
  controllers: [VetsController],
  providers: [VetsService],
  exports: [VetsService],
})
export class VetsModule {}
```

Importa `VetsModule` en `AppModule`.

---

## 13. Módulo `appointments` (Citas)

Este es el módulo "estrella" porque implementa los flujos de los dos diagramas de secuencia.

```bash
nest g module appointments
nest g service appointments --no-spec
nest g controller appointments --no-spec
```

### 13.1 Enum y entidad

`src/appointments/enums/appointment-status.enum.ts`:

```ts
export enum AppointmentStatus {
  AGENDADA = 'AGENDADA',
  CANCELADA = 'CANCELADA',
  ATENDIDA = 'ATENDIDA',
}
```

`src/appointments/entities/appointment.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
import { Vet } from '../../vets/entities/vet.entity';
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
```

> El `@Unique('uq_vet_slot', ['id_veterinario', 'fecha', 'hora'])` evita doble booking del mismo veterinario en el mismo slot.

### 13.2 DTOs

`src/appointments/dto/create-appointment.dto.ts`:

```ts
import { IsDateString, IsInt, IsOptional, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  id_mascota: number;

  @IsInt()
  id_servicio: number;

  @IsOptional()
  @IsInt()
  id_veterinario?: number;

  @IsDateString()
  fecha: string; // '2026-05-10'

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora debe tener formato HH:MM',
  })
  hora: string; // '14:30'
}
```

`src/appointments/dto/change-status.dto.ts`:

```ts
import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export class ChangeStatusDto {
  @IsEnum(AppointmentStatus)
  estado: AppointmentStatus;

  @IsOptional()
  @IsInt()
  id_veterinario?: number;
}
```

### 13.3 Service (con reglas de negocio)

`src/appointments/appointments.service.ts`:

```ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetsService } from '../pets/pets.service';
import { ServicesService } from '../services/services.service';
import { Role } from '../users/enums/role.enum';
import { VetsService } from '../vets/vets.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly pets: PetsService,
    private readonly services: ServicesService,
    private readonly vets: VetsService,
  ) {}

  /** Caso de uso: agendarCita() del usuario dueño */
  async create(userId: number, dto: CreateAppointmentDto) {
    // 1. La mascota debe pertenecer al usuario
    await this.pets.findOneOwned(userId, dto.id_mascota);
    // 2. El servicio debe existir
    await this.services.findOne(dto.id_servicio);
    // 3. (Opcional) si seleccionó veterinario, debe existir
    if (dto.id_veterinario) await this.vets.findOne(dto.id_veterinario);

    // 4. La fecha no puede ser en el pasado
    const target = new Date(`${dto.fecha}T${dto.hora}:00`);
    if (target.getTime() < Date.now()) {
      throw new BadRequestException('La fecha/hora no puede ser pasada');
    }

    // 5. verificarDisponibilidad: si hay veterinario, no debe tener otra cita
    //    en el mismo slot. Si no hay veterinario aún, igual chequeamos
    //    contra el mismo usuario para no duplicarse.
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

  /** El usuario consulta sus propias citas */
  findMine(userId: number) {
    return this.repo.find({
      where: { id_usuario: userId },
      relations: ['mascota', 'servicio', 'veterinario'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });
  }

  /** Vet/Admin: lista la agenda. Si es VETERINARIO, sólo las suyas. */
  async findAgenda(
    user: { id_usuario: number; rol: Role },
    estado?: AppointmentStatus,
  ) {
    const where: any = {};
    if (estado) where.estado = estado;

    if (user.rol === Role.VETERINARIO) {
      const vet = await this.vets.findByUserId(user.id_usuario);
      if (!vet)
        throw new ForbiddenException('No estás registrado como veterinario');
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

  /** Caso de uso: cancelarCita() — el dueño de la cita */
  async cancelByOwner(userId: number, id: number) {
    const cita = await this.findOne(id);
    if (cita.id_usuario !== userId) throw new ForbiddenException();
    if (cita.estado !== AppointmentStatus.AGENDADA) {
      throw new BadRequestException('Sólo se pueden cancelar citas AGENDADAS');
    }
    cita.estado = AppointmentStatus.CANCELADA;
    return this.repo.save(cita);
  }

  /** Caso de uso: aceptarCita() / cancelarCita() del veterinario */
  async changeStatusAsVet(
    user: { id_usuario: number; rol: Role },
    id: number,
    dto: ChangeStatusDto,
  ) {
    const cita = await this.findOne(id);

    let vetId = dto.id_veterinario;
    if (user.rol === Role.VETERINARIO) {
      const vet = await this.vets.findByUserId(user.id_usuario);
      if (!vet)
        throw new ForbiddenException('No estás registrado como veterinario');
      vetId = vet.id_veterinario;
    }

    // Aceptar = pasar a ATENDIDA y asignarse como veterinario
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
```

### 13.4 Controller

`src/appointments/appointments.controller.ts`:

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';
import { AppointmentsService } from './appointments.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './enums/appointment-status.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  // ----- USUARIO (dueño) -----
  @Roles(Role.USUARIO, Role.ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateAppointmentDto) {
    return this.appts.create(user.id_usuario, dto);
  }

  @Roles(Role.USUARIO, Role.ADMIN)
  @Get('mine')
  findMine(@CurrentUser() user: any) {
    return this.appts.findMine(user.id_usuario);
  }

  @Roles(Role.USUARIO, Role.ADMIN)
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.appts.cancelByOwner(user.id_usuario, id);
  }

  // ----- VETERINARIO / ADMIN -----
  @Roles(Role.VETERINARIO, Role.ADMIN)
  @Get('agenda')
  agenda(
    @CurrentUser() user: any,
    @Query('estado') estado?: AppointmentStatus,
  ) {
    return this.appts.findAgenda(user, estado);
  }

  @Roles(Role.VETERINARIO, Role.ADMIN)
  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.appts.changeStatusAsVet(user, id, dto);
  }
}
```

### 13.5 Module

`src/appointments/appointments.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsModule } from '../pets/pets.module';
import { ServicesModule } from '../services/services.module';
import { VetsModule } from '../vets/vets.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    PetsModule,
    ServicesModule,
    VetsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
```

Importa `AppointmentsModule` en `AppModule`.

### 13.6 `AppModule` final

Después de todo, tu `AppModule.imports` debería verse así:

```ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  TypeOrmModule.forRootAsync({ /* ...lo de antes... */ }),
  UsersModule,
  AuthModule,
  PetsModule,
  ServicesModule,
  VetsModule,
  AppointmentsModule,
],
```

---

## 14. Documentación con Swagger

`src/main.ts` (agrega antes de `app.listen`):

```ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('GPI - Atención Caninos API')
  .setDescription('Backend del sistema de atención preventiva y correctiva')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

Reinicia y abre `http://localhost:3000/docs`.

---

## 15. Seed de datos iniciales

Para no insertar el catálogo a mano cada vez, crea un seed mínimo.

`src/seed/seed.service.ts`:

```ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../services/entities/service.entity';
import { ServiceCategory } from '../services/enums/service-category.enum';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepo: Repository<Service>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.servicesRepo.count()) === 0) {
      await this.servicesRepo.save([
        {
          nombre: 'Vacunación anual',
          descripcion: 'Refuerzo polivalente',
          categoria: ServiceCategory.SALUD,
        },
        {
          nombre: 'Baño y peluquería',
          descripcion: 'Corte higiénico',
          categoria: ServiceCategory.ESTETICA,
        },
        {
          nombre: 'Plan nutricional',
          descripcion: 'Evaluación dietaria',
          categoria: ServiceCategory.NUTRICION,
        },
        {
          nombre: 'Guardería diurna',
          descripcion: 'Día completo',
          categoria: ServiceCategory.GUARDERIA,
        },
        {
          nombre: 'Servicio funerario',
          descripcion: 'Cremación individual',
          categoria: ServiceCategory.FUNERARIA,
        },
      ]);
    }

    if ((await this.usersRepo.count({ where: { rol: Role.ADMIN } })) === 0) {
      await this.usersRepo.save({
        nombre: 'Administrador',
        correo: 'admin@gpi.local',
        contrasena: await bcrypt.hash('admin123', 10),
        rol: Role.ADMIN,
      });
    }
  }
}
```

`src/seed/seed.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service, User])],
  providers: [SeedService],
})
export class SeedModule {}
```

Y agrégalo a `AppModule.imports` (al final).

---

## 16. Probar todo con `curl`

Reinicia el server: `npm run start:dev`.

### 16.1 Login del admin (creado por el seed)

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@gpi.local","contrasena":"admin123"}'
```

Guarda el `access_token`:

```bash
TOKEN_ADMIN="pega-aqui-el-token"
```

### 16.2 Registrar un dueño y una mascota

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Mateo","correo":"mateo@test.com","contrasena":"123456","telefono":"3001234567"}'
```

Toma el token devuelto y guárdalo como `TOKEN_USER`. Luego:

```bash
curl -s -X POST http://localhost:3000/api/pets \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Rocky","raza":"Labrador","edad":3}'
```

### 16.3 Listar el catálogo

```bash
curl -s http://localhost:3000/api/services \
  -H "Authorization: Bearer $TOKEN_USER"
```

Filtrando por categoría:

```bash
curl -s "http://localhost:3000/api/services?categoria=SALUD" \
  -H "Authorization: Bearer $TOKEN_USER"
```

### 16.4 Agendar una cita (flujo del primer diagrama)

```bash
curl -s -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer $TOKEN_USER" \
  -H "Content-Type: application/json" \
  -d '{"id_mascota":1,"id_servicio":1,"fecha":"2026-12-01","hora":"10:00"}'
```

### 16.5 Crear un veterinario (admin)

Primero registra un usuario con rol VETERINARIO:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Dra. Pérez","correo":"vet@gpi.local","contrasena":"vet1234","rol":"VETERINARIO"}'
```

Toma el `id_usuario` que devolvió y crea el perfil de veterinario (admin):

```bash
curl -s -X POST http://localhost:3000/api/vets \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Dra. Pérez","especialidad":"General","telefono":"3019876543","id_usuario":2}'
```

### 16.6 El veterinario gestiona su agenda (segundo diagrama)

Login como vet → guarda `TOKEN_VET`:

```bash
curl -s http://localhost:3000/api/appointments/agenda \
  -H "Authorization: Bearer $TOKEN_VET"
```

Aceptar una cita:

```bash
curl -s -X PATCH http://localhost:3000/api/appointments/1/status \
  -H "Authorization: Bearer $TOKEN_VET" \
  -H "Content-Type: application/json" \
  -d '{"estado":"ATENDIDA"}'
```

Cancelar una cita:

```bash
curl -s -X PATCH http://localhost:3000/api/appointments/1/status \
  -H "Authorization: Bearer $TOKEN_VET" \
  -H "Content-Type: application/json" \
  -d '{"estado":"CANCELADA"}'
```

---

## 17. Próximos pasos

Cuando ya domines lo anterior, te recomiendo, en este orden:

1. **Migraciones de TypeORM** en lugar de `synchronize: true` (`typeorm migration:generate`).
2. **CORS** habilitado en `main.ts` para el frontend: `app.enableCors({ origin: 'http://localhost:5173' });`.
3. **Logger** propio (`Logger` de Nest) e interceptor de logs.
4. **Tests unitarios** con Jest (los `*.spec.ts` que omitimos con `--no-spec`).
5. **Refresh tokens** y revocación de sesión.
6. **Paginación** estándar en los `findAll`.
7. **Dockerizar también el backend** con un `Dockerfile` multi-stage para deploy.
8. **Frontend**: React/Next consumiendo `/api` con el `access_token` en `Authorization: Bearer ...`.

---

## Mapa diagramas → módulos

| Diagrama                                    | Pieza de la guía                                            |
| ------------------------------------------- | ----------------------------------------------------------- |
| `Usuario` (clase)                           | Sección 8 — `users/`                                        |
| `Mascota` (clase)                           | Sección 10 — `pets/`                                        |
| `Servicio` + `CategoriaServicio`            | Sección 11 — `services/`                                    |
| `Veterinario`                               | Sección 12 — `vets/`                                        |
| `Cita` + `EstadoCita`                       | Sección 13 — `appointments/`                                |
| Secuencia: **Autenticación**                | Sección 9 — `POST /api/auth/login`                          |
| Secuencia: **Consultar catálogo / detalle** | `GET /api/services`, `GET /api/services/:id`                |
| Secuencia: **Seleccionar mascota**          | `GET /api/pets`                                             |
| Secuencia: **Agendar cita**                 | `POST /api/appointments`                                    |
| Secuencia vet: **Consultar agenda**         | `GET /api/appointments/agenda`                              |
| Secuencia vet: **Aceptar cita**             | `PATCH /api/appointments/:id/status` con `estado=ATENDIDA`  |
| Secuencia vet: **Cancelar cita**            | `PATCH /api/appointments/:id/status` con `estado=CANCELADA` |

¡Listo! Si seguís la guía en orden, al final tenés un backend funcional, alineado 1:1 con los diagramas, con autenticación, roles, validación y documentación. Cuando quieras, te ayudo a iterar (CORS, frontend, deploy, tests, etc.).
