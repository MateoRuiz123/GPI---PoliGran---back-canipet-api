import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { SeedService } from './seed.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [TypeOrmModule.forFeature([Service, User])],
  providers: [SeedService],
})
export class SeedModule {}
