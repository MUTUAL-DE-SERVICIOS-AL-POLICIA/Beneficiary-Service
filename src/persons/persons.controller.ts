import { Controller, ParseIntPipe } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FilteredPaginationDto } from './dto/filter-person.dto';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @MessagePattern('person.create')
  create(@Payload() createPersonDto: CreatePersonDto) {
    return this.personsService.create(createPersonDto);
  }

  @MessagePattern('person.findAll')
  findAll(@Payload() filteredPaginationDto: FilteredPaginationDto) {
    console.log(FilteredPaginationDto);
    return this.personsService.findAll(filteredPaginationDto);
  }

  @MessagePattern('person.findOne')
  async findOne(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.findOne(id);
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
