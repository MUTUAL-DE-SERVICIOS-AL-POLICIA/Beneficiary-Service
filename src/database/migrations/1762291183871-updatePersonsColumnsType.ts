import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePersonsColumnsType1762291183871 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE beneficiaries.persons
                ALTER COLUMN account_number TYPE bigint USING account_number::bigint,
                ALTER COLUMN cell_phone_number TYPE VARCHAR(255) USING cell_phone_number::VARCHAR(255),
                ALTER COLUMN city_birth_id TYPE bigint USING city_birth_id::bigint,
                ALTER COLUMN civil_status TYPE VARCHAR(255) USING civil_status::VARCHAR(255),
                ALTER COLUMN death_certificate_number TYPE VARCHAR(255) USING death_certificate_number::VARCHAR(255),
                ALTER COLUMN financial_entity_id TYPE bigint USING financial_entity_id::bigint,
                ALTER COLUMN first_name TYPE VARCHAR(255) USING first_name::VARCHAR(255),
                ALTER COLUMN gender TYPE VARCHAR(255) USING gender::VARCHAR(255),
                ALTER COLUMN id TYPE bigint USING id::bigint,
                ALTER COLUMN identity_card TYPE VARCHAR(255) USING identity_card::VARCHAR(255),
                ALTER COLUMN last_name TYPE VARCHAR(255) USING last_name::VARCHAR(255),
                ALTER COLUMN mothers_last_name TYPE VARCHAR(255) USING mothers_last_name::VARCHAR(255),
                ALTER COLUMN nua TYPE bigint USING nua::bigint,
                ALTER COLUMN pension_entity_id TYPE bigint USING pension_entity_id::bigint,
                ALTER COLUMN phone_number TYPE VARCHAR(255) USING phone_number::VARCHAR(255),
                ALTER COLUMN reason_death TYPE VARCHAR(255) USING reason_death::VARCHAR(255),
                ALTER COLUMN second_name TYPE VARCHAR(255) USING second_name::VARCHAR(255),
                ALTER COLUMN sigep_status TYPE VARCHAR(255) USING sigep_status::VARCHAR(255),
                ALTER COLUMN surname_husband TYPE VARCHAR(255) USING surname_husband::VARCHAR(255);
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
