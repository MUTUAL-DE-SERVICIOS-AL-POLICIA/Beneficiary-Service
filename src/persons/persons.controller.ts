import { Controller, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { UpdatePersonDto } from './dto/update-person.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FilteredPaginationDto } from './dto/filter-person.dto';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @MessagePattern('person.findAll')
  findAll(@Payload() filteredPaginationDto: FilteredPaginationDto) {
    return this.personsService.findAll(filteredPaginationDto);
  }

  @MessagePattern('person.findOne')
  async findOne(@Payload('term') term: string, @Payload('field') field: string) {
    return this.personsService.findOnePerson(term, field);
  }

  @MessagePattern('person.update')
  update(@Payload() person: UpdatePersonDto) {
    return this.personsService.update(person.id, person);
  }

  @MessagePattern('person.findOneWithFeatures')
  async findPersonAffiliatesWithDetails(@Payload('uuid', ParseUUIDPipe) uuid: string) {
    return this.personsService.findPersonAffiliatesWithDetails(uuid);
  }

  @MessagePattern('person.findAffiliates')
  async findAffiliates(@Payload('id', ParseIntPipe) id: number) {
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

  @MessagePattern('person.validatePersonSms')
  async validatePersonSms(
    @Payload('identityCard') identityCard: string,
    @Payload('cellphone') cellphone: string,
    @Payload('isRegisterCellphone') isRegisterCellphone: boolean,
    @Payload('directAccess') directAccess: boolean,
  ) {
    return this.personsService.validatePersonSms(identityCard, cellphone, isRegisterCellphone, directAccess);
  }

  @MessagePattern('person.validateWhoIsThePerson')
  async validateWhoIsThePerson(@Payload('personId', ParseIntPipe) personId: number) {
    return this.personsService.validateWhoIsThePerson(personId);
  }
}
