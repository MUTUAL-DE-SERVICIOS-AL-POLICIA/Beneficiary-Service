import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto,UpdatePersonDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FingerprintType, Person, PersonFingerprint } from './entities';
import { FilteredPaginationDto } from './dto/filter-person.dto';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FtpService, NatsService } from 'src/common';

@Injectable()
export class PersonsService {
  private readonly logger = new Logger('PersonsService');

  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(PersonFingerprint)
    private readonly personFingerprintRepository: Repository<PersonFingerprint>,
    @InjectRepository(FingerprintType)
    private readonly fingerprintTypeRepository: Repository<FingerprintType>,
    private readonly nats: NatsService,
    private readonly ftp: FtpService,
  ) {}
  async create(createPersonDto: CreatePersonDto) {
    try {
      const person = this.personRepository.create(createPersonDto);
      await this.personRepository.save(person);
      return person;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll(filteredPaginationDto: FilteredPaginationDto) {
    const { limit = 10, page = 1, filter } = filteredPaginationDto;
    const offset = (page - 1) * limit;
    const query = this.personRepository.createQueryBuilder('person');
    if (filter) {
      const formattedFilter = filter.replace(/\s+/g, '').trim();
      query.andWhere(
        ` person.identity_card ILIKE :filter OR
          LOWER(CONCAT(
              person.first_name,
              COALESCE(person.second_name, ''),
              person.last_name,
              COALESCE(person.mothers_last_name, '')
          )) LIKE :filter
        `,
        {
          filter: `%${formattedFilter}%`,
        },
      );
    }
    query.skip(offset).take(limit);
    const [persons, total] = await query.getManyAndCount();
    return {
      persons,
      total,
    };
  }

  async findOne(id: number) {
    const person = await this.personRepository.findOne({
      where: { id: id },
      relations: ['personAffiliates'],
    });
    if (!person) throw new NotFoundException(`Person with: ${id} not found`);
    const isAffiliate = person.personAffiliates.some(
      (affiliate) => affiliate.type === 'affiliates',
    );
    return {
      ...person,
      isAffiliate,
      personAffiliates: undefined,
    };
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.personRepository.preload({
      id: id,
      ...updatePersonDto,
    });

    if (!person) throw new NotFoundException(`Person with: ${id} not found`);

    try {
      await this.personRepository.save(person);
      return person;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async remove(id: number) {
    const person = this.personRepository.findOneBy({ id });
    if (person) {
      await this.personRepository.softDelete(id);
      return `This action removes a #${id} person`;
    } else {
      throw new NotFoundException(`Person with: ${id} not found`);
    }
  }

  async findPersonAffiliatesWithDetails(personId: number): Promise<any> {
    const person = await this.findAndVerifyPersonWithRelations(
      personId,
      'personAffiliates',
      'affiliates',
      'type',
    );
    const {
      createdAt,
      updatedAt,
      deletedAt,
      uuidColumn,
      cityBirthId,
      pensionEntityId,
      financialEntityId,
      nua,
      idPersonSenasir,
      dateLastContribution,
      personAffiliates,
      ...dataPerson
    } = person;
    const personAffiliate = await Promise.all(
      personAffiliates.map(async (personAffiliate) => {
        const { kinshipType, createdAt, updatedAt, deletedAt, ...dataPersonAffiliate } =
          personAffiliate;
        const kinship = await this.nats.fetchAndClean(kinshipType, 'kinships.findOne', [
          'createdAt',
          'updatedAt',
          'deletedAt',
        ]);
        return {
          ...dataPersonAffiliate,
          kinship,
        };
      }),
    );
    const [cityBirth, pensionEntity, financialEntity] = await Promise.all([
      this.nats.fetchAndClean(cityBirthId, 'cities.findOne', [
        'secondShortened',
        'thirdShortened',
        'toBank',
        'latitude',
        'longitude',
        'companyAddress',
        'phonePrefix',
        'companyPhones',
        'companyCellphones',
      ]),
      this.nats.fetchAndClean(pensionEntityId, 'pensionEntities.findOne', ['type', 'isActive']),
      this.nats.fetchAndClean(financialEntityId, 'financialEntities.findOne', [
        'createdAt',
        'updatedAt',
      ]),
    ]);
    const birthDateLiteral = format(person.birthDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    return {
      ...dataPerson,
      birthDateLiteral: birthDateLiteral,
      personAffiliate,
      cityBirth,
      pensionEntity,
      financialEntity,
    };
  }

  async findAffiliteRelatedWithPerson(id: number): Promise<any> {
    const personAffiliates = await this.findAndVerifyPersonWithRelations(
      id,
      'personAffiliates',
      'persons',
      'type',
    );
    return personAffiliates;
  }
  private handleDBException(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexecpected Error');
  }

  private async findAndVerifyPersonWithRelations(
    id: number,
    relation: string,
    registration: string,
    field: string,
  ): Promise<Person | null> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: [relation],
    });
    if (!person) {
      throw new NotFoundException(`Affiliate with ID: ${id} not found`);
    }
    if (!person[relation]) {
      throw new Error(`campo ${relation} no existe en person`);
    }
    const filteredRelatedData = person[relation].filter(
      (related) => related[field] === registration,
    );
    return {
      ...person,
      personAffiliates: filteredRelatedData,
    };
  }
}
