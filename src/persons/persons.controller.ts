import { Controller, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @MessagePattern('person.create')
  create(@Payload() createPersonDto: CreatePersonDto) {
    return this.personsService.create(createPersonDto);
  }

  @MessagePattern('person.findAll')
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.personsService.findAll(paginationDto);
  }

  @MessagePattern('person.findOne')
  async findOne(@Payload('id', ParseIntPipe) id: number) {

    const person = await this.personsService.findOne(id);
    if (!person) throw new NotFoundException(`person with id ${id} no encontrado`);

    return person;
  }

  @MessagePattern('person.update')
  update(@Payload() updatePersonDto: UpdatePersonDto) {
    return this.personsService.update(updatePersonDto.id, updatePersonDto);
  }

  @MessagePattern('person.delete')
  remove(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.remove(id);
  }
}
