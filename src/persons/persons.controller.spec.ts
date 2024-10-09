import { Test, TestingModule } from '@nestjs/testing';
import { PersonsController } from './persons.controller';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { NotFoundException } from '@nestjs/common';
import { envs } from '../config';
import { PersonsService } from './persons.service';

describe('PersonsController', () => {
  let controller: PersonsController;
  let repository: Repository<Person>;
  let dataSource: DataSource;

  const personExample = {
    //"id": 0,
    uuid_column: '703b17c1-ad5d-493f-946b-f81f059be7be', // random UUID
    city_birth_id: null,
    pension_entity_id: null,
    financial_entity_id: null,
    first_name: 'Juan',
    second_name: '',
    last_name: '',
    mothers_last_name: '',
    surname_husband: null,
    identity_card: '',
    due_date: null,
    is_duedate_undefined: false,
    gender: '',
    civil_status: '',
    birth_date: null,
    date_death: null,
    death_certificate_number: null,
    reason_death: null,
    phone_number: null,
    cell_phone_number: null,
    nua: 0,
    account_number: null,
    sigep_status: null,
    id_person_senasir: null,
    date_last_contribution: null,
    createdAt: '2017-01-01 12:00:00.000',
    updatedAt: '2017-01-01 12:00:00.000',
    deletedAt: null,
    fingerprints: [
      {
        wsq: '',
        quality: 0,
        finger_id: 0,
      },
    ],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: envs.dbTestHost,
          port: envs.dbTestPort,
          database: envs.dbTestName,
          username: envs.dbTestUsername,
          password: envs.dbTestPassword,
          entities: [Person],
          synchronize: true, // Para pruebas, asegúrate de que las tablas se creen automáticamente
        }),
        TypeOrmModule.forFeature([Person]),
      ],
      controllers: [PersonsController],
      providers: [PersonsService],
    }).compile();
    controller = module.get<PersonsController>(PersonsController);
    repository = module.get<Repository<Person>>(getRepositoryToken(Person));
    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  afterEach(async () => {
    await repository.clear(); // Limpia la tabla después de cada prueba
  });

  afterAll(async () => {
    await repository.query('DROP TABLE beneficiaries.persons;'); // Elimina la tabla después de las pruebas
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy(); // Cierra la conexión a la base de datos
    }
  });

  describe('create', () => {
    it('should create a new person', async () => {
      const createPersonDto: CreatePersonDto = personExample;
      const result = await controller.create(createPersonDto);

      expect(result).toHaveProperty('id');
      expect(result.first_name).toBe('Juan');
    });
  });

  describe('findOne', () => {
    it('should return a person if found', async () => {
      const person = await controller.create(personExample);

      const result = await controller.findOne(person.id);
      expect(result).toBeDefined();
      expect(result.first_name).toBe('Juan');
    });

    it('should throw NotFoundException if person is not found', async () => {
      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return an array of persons from the database', async () => {
      // Insertar algunos registros de prueba
      const personExample2 = { ...personExample };
      personExample2.first_name = 'Pedro';
      await controller.create(personExample);
      await controller.create(personExample2);

      const result = await controller.findAll({ limit: 10, page: 1 });
      expect(result.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update a person', async () => {
      const person = await controller.create(personExample);

      const updatePersonDto: UpdatePersonDto = {
        id: person.id,
        first_name: 'Juan Updated',
      };
      const result = await controller.update(updatePersonDto);

      expect(result.first_name).toBe('Juan Updated');
    });
  });

  describe('remove', () => {
    it('should remove a person', async () => {
      const person = await controller.create(personExample);
      const personId = person.id;

      await controller.remove(personId);
      const deletedPerson = controller.findOne(personId);

      expect(deletedPerson).rejects.toThrow(NotFoundException);
    });
  });
});
