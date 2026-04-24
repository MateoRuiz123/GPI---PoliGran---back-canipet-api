import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { PetsModule } from 'src/pets/pets.module';
import { ServicesModule } from 'src/services/services.module';
import { VetsModule } from 'src/vets/vets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    PetsModule,
    ServicesModule,
    VetsModule,
  ],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
