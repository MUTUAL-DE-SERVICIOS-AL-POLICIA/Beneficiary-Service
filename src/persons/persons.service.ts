import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './entities/person.entity';

@Injectable()
export class PersonsService {

  private readonly logger = new Logger('PersonsService');

  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ){}
  async create(createPersonDto: CreatePersonDto) {

    try {

      const person = this.personRepository.create(createPersonDto);
      await this.personRepository.save( person );
      return person;

    } catch (error) {

      this.handleDBException(error);

    }
  }

  findAll() {
    return this.personRepository.find({})
  }

  findOne(id: number) {
    return this.personRepository.findOneBy({id});
  }

  update(id: number, updatePersonDto: UpdatePersonDto) {
    return `This action updates a #${id} person`;
  }

  remove(id: number) {
    return `This action removes a #${id} person`;
  }

  private handleDBException( error:any ){

    if (error.code === '23505')
      throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexecpected Error')


  }
}
