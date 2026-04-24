import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from 'src/services/entities/service.entity';
import { ServiceCategory } from 'src/services/enums/service-category.enum';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/users/enums/role.enum';
import { Repository } from 'typeorm';
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
