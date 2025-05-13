import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Person } from 'src/persons/entities/person.entity';
import { PersonAffiliate } from 'src/persons/entities/person-affiliate.entity';
import { optionsTest } from '../data-source-test';

describe('Trigger replicate_affiliates_to_persons_and_persons_aff (e2e)', () => {
  let personRepo: Repository<Person>;
  let personAffiliateRepo: Repository<PersonAffiliate>;
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(optionsTest),
        TypeOrmModule.forFeature([Person, PersonAffiliate]),
      ],
    }).compile();

    personRepo = module.get(getRepositoryToken(Person));
    personAffiliateRepo = module.get(getRepositoryToken(PersonAffiliate));
    dataSource = module.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE beneficiaries.person_affiliates CASCADE');
    await dataSource.query('TRUNCATE TABLE beneficiaries.affiliates CASCADE');
    await dataSource.query('TRUNCATE TABLE beneficiaries.persons CASCADE');
  });

  it('test', () => {
    console.log('test');
  });

  it('should replicate data into persons and person_affiliates on INSERT into affiliates', async () => {
    const uuid = randomUUID();

    await dataSource.query(`
        INSERT INTO public.affiliates (
          city_birth_id, pension_entity_id, financial_entity_id,
          first_name, second_name, last_name, mothers_last_name,
          identity_card, due_date, is_duedate_undefined, gender,
          civil_status, birth_date, created_at, updated_at, uuid_reference,
          registration, type, date_entry, service_years, service_months,
          unit_police_description, affiliate_state_id
        ) VALUES (
          1, 2, 3, 'John', 'Doe', 'Smith', 'Brown',
          '12345678', '2030-01-01', FALSE, 'M',
          'S', '1990-01-01', NOW(), NOW(), '${uuid}',
          'REG123', 'Comando', '2020-01-01', 5, 6,
          '', 1
        );
      `);

    const person = await personRepo.findOne({ where: { uuidColumn: uuid } });
    expect(person).toBeDefined();
    expect(person?.firstName).toBe('John');

    console.log(person);

    // const personAffiliate = await personAffiliateRepo.findOne({
    //   where: {
    //     person: { id: person?.id },
    //     type: 'affiliates',
    //     kinshipType: 1,
    //   },
    // });
    // console.log(personAffiliate);

    // expect(personAffiliate).toBeDefined();
    // expect(personAffiliate?.state).toBe(true);
  });
});
