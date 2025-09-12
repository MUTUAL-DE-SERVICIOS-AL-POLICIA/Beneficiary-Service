import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NatsService } from 'src/common';
import { envsFtp } from 'src/config/envs';
import { Repository } from 'typeorm';
import { CreatePersonDto, UpdatePersonDto } from './dto';
import { FilteredPaginationDto } from './dto/filter-person.dto';
import { FingerprintType, Person, PersonAffiliate, PersonFingerprint } from './entities';

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
    const { limit = 10, page = 1, filter, orderBy = 'id', order = 'ASC' } = filteredPaginationDto;
    const offset = (page - 1) * limit;
    const query = this.personRepository.createQueryBuilder('person');
    const filterValues = filter?.split(' ');
    if (Array.isArray(filterValues) && filterValues.length > 0) {
      const identityConditions: string[] = [];
      const nameConditions: string[] = [];
      const params: Record<string, string> = {};

      filterValues.forEach((f, i) => {
        const trimmedFilter = f.trim();
        const paramKey = `filterValues${i}`;

        if (/^\d/.test(trimmedFilter)) {
          // Si es un número, solo busca en identity_card
          identityConditions.push(`person.identity_card ILIKE :${paramKey}`);
        } else {
          // Si tiene letras, busca en los nombres
          nameConditions.push(`
            LOWER(TRIM(CONCAT_WS(' ',
                person.first_name,
                person.second_name,
                person.last_name,
                person.mothers_last_name)
            )) LIKE :${paramKey}
          `);
        }

        params[paramKey] = `%${trimmedFilter}%`;
      });

      const conditions = [];
      if (identityConditions.length > 0) {
        conditions.push(`(${identityConditions.join(' OR ')})`);
      }
      if (nameConditions.length > 0) {
        conditions.push(`(${nameConditions.join(' AND ')})`);
      }

      if (conditions.length > 0) {
        query.andWhere(conditions.join(' OR '), params);
      }
    }

    query
      .skip(offset)
      .take(limit)
      .orderBy(`person.${orderBy}`, order as 'ASC' | 'DESC');
    const [persons, total] = await query.getManyAndCount();

    return {
      persons,
      total,
    };
  }

  async findOnePerson(term: string, field: string): Promise<Person> {
    const queryBuilder = this.personRepository.createQueryBuilder('person');
    const value = field === 'id' ? +term : term;
    const person = await queryBuilder
      .leftJoinAndSelect('person.personAffiliates', 'personAffiliates')
      .leftJoinAndSelect('person.personFingerprints', 'personFingerprints')
      .leftJoinAndSelect('personFingerprints.fingerprintType', 'fingerprintType')
      .where(`person.${field} = :value`, { value })
      .getOne();
    if (!person) {
      throw new RpcException({
        code: 404,
        message: `Persona: ${term} no encontrada`,
      });
    }
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

  async findPersonAffiliatesWithDetails(uuid: string): Promise<any> {
    const person = await this.findOnePerson(`${uuid}`, 'uuid_column');
    const [beneficiariesResult, affiliates] = await Promise.all([
      this.getBeneficiaries(person.id, true),
      this.findAffiliates(person.id),
    ]);
    const features = {
      isPolice: person.personAffiliates.some((affiliate) => affiliate.type === 'affiliates'),
      hasBeneficiaries: beneficiariesResult.beneficiaries.length > 0,
      hasAffiliates: affiliates.length > 0,
    };
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
      personAffiliates,
      ...dataPerson
    } = person;
    const nup = person.personAffiliates.find((p) => p.type === 'affiliates')?.typeId ?? null;
    const [cityBirth, pensionEntity, financialEntity] = await Promise.all([
      this.nats.firstValueInclude({ id: cityBirthId }, 'cities.findOne', [
        'id',
        'name',
        'firstShortened',
      ]),
      this.nats.firstValueInclude({ id: pensionEntityId }, 'pensionEntities.findOne', [
        'id',
        'name',
      ]),
      this.nats.firstValueInclude({ id: pensionEntityId }, 'financialEntities.findOne', [
        'id',
        'name',
      ]),
    ]);
    const birthDateLiteral = format(person.birthDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    return {
      ...dataPerson,
      birthDateLiteral: birthDateLiteral,
      nup,
      cityBirth,
      pensionEntity,
      financialEntity,
      features,
    };
  }

  async findAffiliates(id: number): Promise<any> {
    const affiliatesResponse = await this.personAffiliateRepository
      .createQueryBuilder('pa')
      .leftJoin('persons', 'p', 'p.id = pa.typeId')
      .leftJoin(
        'person_affiliates',
        'paAffiliate',
        'paAffiliate.person_id = p.id AND paAffiliate.type = :affiliateType',
        { affiliateType: 'affiliates' },
      )
      .where('pa.person_id = :id', { id })
      .andWhere('pa.type = :personType', { personType: 'persons' })
      .select([
        'p.uuid_column AS "uuidColumn"',
        `CONCAT_WS(' ', p.first_name, p.second_name, p.last_name, p.mothers_last_name) AS "fullName"`,
        'p.identity_card AS "identityCard"',
        'pa.state AS "state"',
        'paAffiliate.type_id AS "nup"',
      ])
      .orderBy('pa.state', 'DESC')
      .getRawMany();

    return affiliatesResponse;
  }

  async getBeneficiaries(id: number, verify: boolean = false): Promise<any> {
    const personAffiliates = await this.personAffiliateRepository.find({
      where: { typeId: id, type: 'persons' },
      relations: ['person'],
    });
    if (personAffiliates.length === 0 || verify) {
      return { serviceStatus: true, beneficiaries: personAffiliates };
    }
    const kinshipTypeIds = [...new Set(personAffiliates.map((b) => b.kinshipType))];
    const kinships = await this.nats.firstValue('kinships.findAllByIds', { ids: kinshipTypeIds });
    const beneficiaries = personAffiliates
      .map(({ person, kinshipType, state }) => ({
        fullName: [person.firstName, person.secondName, person.lastName, person.mothersLastName]
          .filter(Boolean)
          .join(' '),
        kinship: !kinships.serviceStatus
          ? kinshipType
          : (kinships[kinshipType].name ?? kinshipType),
        identityCard: person.identityCard,
        uuidColumn: person.uuidColumn,
        state,
      }))
      .sort((a, b) => Number(b.state) - Number(a.state));
    return {
      serviceStatus: kinships.serviceStatus,
      beneficiaries,
    };
  }
  async createPersonFingerPrint(personId: number, personFingerprints: any[]): Promise<any> {
    const person = await this.findOnePerson(`${personId}`, 'id');
    const uploadFiles: any[] = [];
    const removeFiles: string[] = [];

    const uploadResults = await personFingerprints.reduce(
      async (accPromise, fingerprint) => {
        const acc = await accPromise;
        const { quality, fingerprintTypeId } = fingerprint;
        const personFingerprints = await this.personFingerprintRepository.find({
          where: { person: { id: personId }, fingerprintType: { id: fingerprintTypeId } },
          relations: ['fingerprintType'],
        });
        const initialPath = `${envsFtp.ftpFingerprints}/${personId}/`;
        const existingFingerprint = personFingerprints.find((fp) => fp.quality === quality);
        if (existingFingerprint) {
          acc.error.push(`Ya existe una huella con calidad ${quality}, no se subirá nuevamente.`);
          return acc;
        }
        if (personFingerprints.length < 3) {
          const fingerprintType = await this.fingerprintTypeRepository.findOne({
            where: { id: fingerprintTypeId },
          });
          if (!fingerprintType) {
            throw new RpcException(`Tipo de huella con ID ${fingerprintTypeId} no encontrado`);
          }
          const path = `${initialPath}${fingerprintType.short_name}_${quality}.wsq`;
          const newPersonFingerprint = this.personFingerprintRepository.create({
            person,
            quality,
            fingerprintType,
            path,
          });
          await this.personFingerprintRepository.save(newPersonFingerprint);
          uploadFiles.push({ fileId: fingerprintTypeId, path });
          acc.success.push(`Huella registrada con calidad ${quality}: ${path}`);
          return acc;
        }
        const fingerprintMinQuality = personFingerprints.reduce(
          (min, current) => (current.quality < min.quality ? current : min),
          personFingerprints[0],
        );
        if (quality > fingerprintMinQuality.quality) {
          const removePath: string = fingerprintMinQuality.path;
          const fingerprintType = fingerprintMinQuality.fingerprintType;
          fingerprintMinQuality.quality = quality;
          fingerprintMinQuality.path = `${initialPath}${fingerprintType.short_name}_${quality}.wsq`;
          fingerprintMinQuality.updatedAt = new Date();
          await this.personFingerprintRepository.save(fingerprintMinQuality);
          removeFiles.push(removePath);
          uploadFiles.push({ fileId: fingerprintTypeId, path: fingerprintMinQuality.path });
          acc.success.push(
            `Huella reemplazada con calidad ${quality}: ${fingerprintMinQuality.path}`,
          );
        } else {
          acc.error.push(
            `La calidad ${quality} no es suficiente para reemplazar la huella de menor calidad.`,
          );
        }
        return acc;
      },
      Promise.resolve({ success: [], error: [] }),
    );
    let message = '';
    if (uploadResults.success.length > 0 && uploadResults.error.length > 0) {
      message = `Algunas huellas fueron registradas y otras no debido a calidad duplicada o insuficiente.`;
    } else if (uploadResults.success.length > 0) {
      message = `Las huellas se han registrado correctamente.`;
    } else {
      message = `No se registraron huellas porque ya existían con las mismas calidades o porque la calidad era insuficiente.`;
    }

    return {
      message,
      registros: {
        success: uploadResults.success,
        error: uploadResults.error,
      },
      uploadFiles,
      removeFiles,
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

  async getFingerprints(personId: number, columns?: string[]): Promise<any> {
    const columnsToSelect =
      columns && columns.length > 0
        ? columns.map((col) => `pf.${col}`)
        : this.personFingerprintRepository.metadata.columns.map((col) => `pf.${col.propertyName}`);

    const fingerprints = await this.personFingerprintRepository
      .createQueryBuilder('pf')
      .select(columnsToSelect)
      .leftJoinAndSelect('pf.fingerprintType', 'ft')
      .where('pf.person_id = :personId', { personId })
      .getMany();

    return fingerprints;
  }

  private handleDBException(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexecpected Error');
  }
}
