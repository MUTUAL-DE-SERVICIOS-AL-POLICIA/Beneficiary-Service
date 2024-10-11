import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './entities';
import { FilteredPaginationDto } from './dto/filter-person.dto';

@Injectable()
export class PersonsService {
  private readonly logger = new Logger('PersonsService');

  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
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

  async findPersonAffiliatesWithDetails(id: number): Promise<any> {
    const person = await this.findAndVerifyPersonWithRelations(
      id,
      'personAffiliates',
      'affiliates',
      'type',
    );
    const personDetails = await this.personRepository.findOne({
      where: { id },
    });
    return {
      ...personDetails,
      relations: person,
    };
  }

  async findAffiliteRelatedWithPerson(id: number): Promise<any> {
    const personAffiliates = await this.findAndVerifyPersonWithRelations(
      id,
      'personAffiliates',
      'persons',
      'type',
    );
    if (personAffiliates.length > 0) {
      const relatedPersonId = personAffiliates[0].type_id;
      const relatedPerson = await this.personRepository.findOne({
        where: { id: relatedPersonId },
      });

      if (!relatedPerson) {
        throw new NotFoundException(`Person with ID: ${relatedPersonId} not found`);
      }

      return relatedPerson;
    }
    return { message: 'No affiliates found related to the person.' };
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
    const relatedData = person[relation];
    const found = relatedData.filter(item => item[field] === registration);
    return found.length > 0 ? found : [];
  }
}
