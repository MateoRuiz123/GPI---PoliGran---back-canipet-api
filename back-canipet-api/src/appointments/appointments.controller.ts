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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/users/enums/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { ChangeStatusDto } from './dto/change-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  //USUARIO (dueño)
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

  // VETERINARIO / ADMIN
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
