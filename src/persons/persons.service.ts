import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto, CreatePersonFingerprintDto, UpdatePersonDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FingerprintType, Person, PersonAffiliate, PersonFingerprint } from './entities';
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
    @InjectRepository(PersonAffiliate)
    private readonly personAffiliateRepository: Repository<PersonAffiliate>,
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
  async showListFingerprint(): Promise<any> {
    const listFingerprint = await this.fingerprintTypeRepository.find();
    return listFingerprint.map(({ id, name }) => ({ id, name }));
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

  async findOnePerson(idPerson: number): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id: idPerson },
      relations: ['personAffiliates', 'personFingerprints', 'personFingerprints.fingerprintType'],
    });
    if (!person) throw new NotFoundException(`Person with: ${idPerson} not found`);
    return person;
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

  async showPersonsRelatedToAffiliate(id: number): Promise<any> {
    const dependents = await this.personAffiliateRepository.find({
      where: {
        typeId: id,
        type: 'persons',
      },
      relations: ['person'],
    });
    const personAffiliate = await Promise.all(
      dependents.map(async (personAffiliate) => {
        const { person, kinshipType, createdAt, updatedAt, deletedAt, ...dataPersonAffiliate } =
          personAffiliate;
        const kinship = await this.nats.fetchAndClean(kinshipType, 'kinships.findOne', [
          'createdAt',
          'updatedAt',
          'deletedAt',
        ]);
        const personInfo = personAffiliate.person
          ? {
              full_name: [
                personAffiliate.person.firstName,
                personAffiliate.person.secondName,
                personAffiliate.person.lastName,
                personAffiliate.person.mothersLastName,
              ]
                .filter(Boolean)
                .join(' '),
              identityCard: personAffiliate.person.identityCard,
            }
          : null;

        return {
          ...dataPersonAffiliate,
          kinship,
          person: personInfo,
        };
      }),
    );
    return personAffiliate;
  }

  async createPersonFingerPrint(
    createPersonFingerprintDto: CreatePersonFingerprintDto,
  ): Promise<{ message: string; registros: { success: string[]; error: string[] } }> {
    const { personId, fingerprints } = createPersonFingerprintDto;
    const person = await this.findOnePerson(personId);
    const uploadResults = await fingerprints.reduce(
      async (accPromise, fingerprint) => {
        const acc = await accPromise;
        const { wsq, quality, fingerprintTypeId } = fingerprint;
        const buffer = Buffer.from(wsq, 'base64');
        let personFingerprint = await this.personFingerprintRepository.findOne({
          where: { person: person, fingerprintType: { id: fingerprintTypeId } },
          relations: ['fingerprintType'],
        });
        let fingerprintType;
        if (personFingerprint) {
          personFingerprint.quality = quality;
          fingerprintType = personFingerprint.fingerprintType;
        } else {
          fingerprintType = await this.fingerprintTypeRepository.findOne({
            where: { id: fingerprintTypeId },
          });
          if (!fingerprintType) {
            throw new NotFoundException(`Tipo de huella con ID ${fingerprintTypeId} no encontrado`);
          }
          const initialPath = `Person/Fingerprint/${personId}/`;
          const path = `${initialPath}${fingerprintType.name}.wsq`;
          personFingerprint = this.personFingerprintRepository.create({
            person,
            quality,
            fingerprintType,
            path,
          });
        }
        await this.personFingerprintRepository.save(personFingerprint);
        const initialPath = `Person/Fingerprint/${personId}/`;
        const path = `${initialPath}${personFingerprint.fingerprintType.name}.wsq`;
        try {
          await this.ftp.connectToFtp();
          await this.ftp.uploadFile(buffer, initialPath, path);
          await this.ftp.onDestroy();
          acc.success.push(fingerprintType.name);
        } catch (error) {
          console.error(`Error uploading fingerprint with ID ${fingerprintTypeId}:`, error);
          acc.error.push(fingerprintType.name);
        }
        return acc;
      },
      Promise.resolve({ success: [], error: [] }),
    );
    const successMessage = uploadResults.success.join(', ');
    const message =
      uploadResults.success.length > 0
        ? `Las huellas: ${successMessage} se han registrado correctamente.`
        : 'No se registró ninguna huella correctamente.';
    return {
      message,
      registros: {
        success: uploadResults.success,
        error: uploadResults.error,
      },
    };
  }

  async showFingerprintRegistered(personId: number): Promise<any> {
    const person = await this.personRepository.findOne({
      where: { id: personId },
      relations: ['personFingerprints', 'personFingerprints.fingerprintType'],
    });
    const fingerprints = person.personFingerprints.map((fingerprint) => ({
      id: fingerprint.fingerprintType.id,
      name: fingerprint.fingerprintType.name,
    }));
    return { fingerprints };
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
