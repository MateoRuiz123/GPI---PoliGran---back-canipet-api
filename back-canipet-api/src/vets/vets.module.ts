import { Module } from '@nestjs/common';
import { VetsService } from './vets.service';
import { VetsController } from './vets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vet } from './entities/vet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vet])],
  providers: [VetsService],
  controllers: [VetsController],
  exports: [VetsService],
})
export class VetsModule {}
