import { Controller, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
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
    return this.personsService.findAll(filteredPaginationDto);
  }

  @MessagePattern('person.findOne')
  async findOne(@Payload('term') term: string, @Payload('field') field: string) {
    return this.personsService.findOnePerson(term, field);
  }

  @MessagePattern('person.update')
  update(@Payload() updatePersonDto: UpdatePersonDto) {
    return this.personsService.update(updatePersonDto.id, updatePersonDto);
  }

  @MessagePattern('person.delete')
  remove(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.remove(id);
  }

  @MessagePattern('person.findOneWithFeatures')
  async findPersonAffiliatesWithDetails(@Payload('uuid', ParseUUIDPipe) uuid: string) {
    return this.personsService.findPersonAffiliatesWithDetails(uuid);
  }

  @MessagePattern('person.findAffiliates')
  async findAffilites(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.findAffiliates(id);
  }

  @MessagePattern('person.getBeneficiariesOfAffiliate')
  async getBeneficiariesOfAffiliate(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.getBeneficiaries(id);
  }

  @MessagePattern('person.createPersonFingerprint')
  async createPersonFingerprint(data: { personId: number; personFingerprints: any[] }) {
    return this.personsService.createPersonFingerPrint(data.personId, data.personFingerprints);
  }

  @MessagePattern('person.showFingerprintRegistered')
  async showFingerprintRegistered(@Payload('id', ParseIntPipe) id: number) {
    return this.personsService.showFingerprintRegistered(id);
  }

  @MessagePattern('person.showListFingerprint')
  async showListFingerprint() {
    return this.personsService.showListFingerprint();
  }

  @MessagePattern('person.getFingerprints')
  async getFingerprints(data: { id: number; columns?: string[] }) {
    return this.personsService.getFingerprints(data.id, data.columns);
  }
}
