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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PetsService } from './pets.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Controller('pets')
@UseGuards(JwtAuthGuard)
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
