import testDataSource from '../../test/data-source-test';
import { QueryRunner } from 'typeorm';
// import { Affiliate } from 'src/affiliates/entities';
import { Person, PersonAffiliate } from 'src/persons/entities';

describe('Trigger replicate_affiliates_to_persons_and_persons_aff (e2e)', () => {
  // const affiliateRepo = testDataSource.getRepository(Affiliate);
  const personRepo = testDataSource.getRepository(Person);
  const personAffiliateRep = testDataSource.getRepository(PersonAffiliate);
  let queryRunner: QueryRunner;
  beforeEach(async () => {
    queryRunner = testDataSource.createQueryRunner();
    // Limpia todas las tablas relevantes antes de cada test
    await testDataSource.query('TRUNCATE TABLE beneficiaries.person_affiliates CASCADE');
    await testDataSource.query('TRUNCATE TABLE beneficiaries.affiliates CASCADE');
    await testDataSource.query('TRUNCATE TABLE beneficiaries.persons CASCADE');
  });

  it('should replicate data into persons and person_affiliates on INSERT into affiliates', async () => {
    // 1. Inserta un Affiliate
    const uuid = crypto.randomUUID();
    await queryRunner.query(`
        INSERT INTO public.affiliate (
          city_birth_id,
          pension_entity_id,
          financial_entity_id,
          first_name,
          second_name,
          last_name,
          mothers_last_name,
          surname_husband,
          identity_card,
          due_date,
          is_duedate_undefined,
          gender,
          civil_status,
          birth_date,
          created_at,
          updated_at,
          uuid_reference,
          registration,
          type,
          date_entry,
          service_years,
          service_months,
          unit_police_description,
          affiliate_state_id
        ) VALUES (
          1,
          2,
          3,
          'John',
          'Doe',
          'Smith',
          'Brown',
          NULL,
          '12345678',
          '2030-01-01',
          FALSE,
          'M',
          'Single',
          '1990-01-01',
          NOW(),
          NOW(),
          '${uuid}',
          'REG123',
          'Regular',
          '2020-01-01',
          5,
          6,
          'Unit A',
          1
        );
      `);

    const newAffiliate = await queryRunner.query(`
        select id from public.affiliates where uuid_reference=${uuid};
        `);

    // 2. Validar que exista un nuevo Person
    const person = await personRepo.findOneBy({ uuidColumn: uuid });
    expect(person).toBeDefined();
    expect(person?.firstName).toBe('John');

    // 3. Validar que exista en person_affiliates
    const personAffiliate = await personAffiliateRep.findOneBy({
      person: { id: person?.id },
      type: 'affiliates',
      typeId: newAffiliate.id,
    });
    expect(personAffiliate).toBeDefined();
    expect(personAffiliate?.state).toBe(true);
    expect(personAffiliate?.kinshipType).toBe(1);
  });

  //   it('should update data in persons and affiliates on UPDATE of affiliate', async () => {
  //     // 1. Inserta un Affiliate inicial
  //     const newAffiliate = affiliateRepo.create({
  //       city_birth_id: 1,
  //       pension_entity_id: 2,
  //       financial_entity_id: 3,
  //       first_name: 'John',
  //       second_name: 'Doe',
  //       last_name: 'Smith',
  //       mothers_last_name: 'Brown',
  //       identity_card: '12345678',
  //       due_date: new Date('2030-01-01'),
  //       is_duedate_undefined: false,
  //       gender: 'M',
  //       civil_status: 'Single',
  //       birth_date: new Date('1990-01-01'),
  //       created_at: new Date(),
  //       updated_at: new Date(),
  //       uuid_reference: crypto.randomUUID(),
  //       registration: 'REG123',
  //       type: 'Regular',
  //       date_entry: new Date('2020-01-01'),
  //       service_years: 5,
  //       service_months: 6,
  //       unit_police_description: 'Unit A',
  //       affiliate_state_id: 1,
  //     });

  //     await affiliateRepo.save(newAffiliate);

  //     // 2. Actualiza el Affiliate
  //     newAffiliate.first_name = 'Jane';
  //     newAffiliate.last_name = 'Doe';
  //     await affiliateRepo.save(newAffiliate);

  //     // 3. Valida que se haya actualizado en Person también
  //     const person = await personRepo.findOneBy({ uuid_column: newAffiliate.uuid_reference });
  //     expect(person).toBeDefined();
  //     expect(person?.first_name).toBe('Jane');
  //     expect(person?.last_name).toBe('Doe');
  //   });
});
