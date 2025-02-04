import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class BeneficiaryMigrateAffiliates implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<any> {
    await dataSource.query(`INSERT INTO beneficiaries.persons (
      city_birth_id,
      pension_entity_id, financial_entity_id,
      first_name, second_name, last_name,
      mothers_last_name, surname_husband,
      identity_card, due_date, is_duedate_undefined,
      gender, civil_status, birth_date,
      date_death, death_certificate_number,
      reason_death, phone_number, cell_phone_number,
      nua, account_number, sigep_status,
      id_person_senasir, date_last_contribution,
      created_at, updated_at, deleted_at,
      uuid_column
            )
            SELECT city_birth_id, pension_entity_id, financial_entity_id,
            first_name, second_name, last_name, mothers_last_name, surname_husband, identity_card, due_date, is_duedate_undefined,
            gender, civil_status, birth_date, date_death, death_certificate_number, reason_death, phone_number, cell_phone_number,
            nua, account_number, sigep_status, id_person_senasir, date_last_contribution, created_at, updated_at, deleted_at,
            uuid_reference
            FROM public.affiliates
            order by id;`);
    await dataSource.query(`INSERT INTO beneficiaries.state_types
    SELECT *
    FROM public.affiliate_state_types;`);
    await dataSource.query(`INSERT INTO beneficiaries.affiliate_states (id, state_type_id, name)
    SELECT *
    FROM public.affiliate_states;`);
    await dataSource.query(`INSERT INTO beneficiaries.affiliates (id, affiliate_state_id, registration, type, date_entry, date_derelict, reason_derelict, service_years, service_months,
    unit_police_description, created_at, updated_at, unit_id, category_id, degree_id)
    SELECT id, affiliate_state_id, registration, type, date_entry::date, date_derelict::date, reason_derelict, service_years, service_months,
    unit_police_description, created_at, updated_at,
    unit_id, category_id, degree_id
    FROM public.affiliates
    order by id;`);
    await dataSource.query(`INSERT INTO beneficiaries.person_affiliates
    (person_id, type, type_id, kinship_type, state)
    SELECT p.id, 'affiliates', a.id, 1, true
    FROM beneficiaries.persons p
    JOIN public.affiliates a
    ON p.uuid_column = a.uuid_reference
    ORDER BY p.id, a.id;`);
  }
}
