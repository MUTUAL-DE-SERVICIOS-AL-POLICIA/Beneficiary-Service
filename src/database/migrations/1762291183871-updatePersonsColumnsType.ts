import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePersonsColumnsType1762291183871 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE beneficiaries.affiliate_documents DROP CONSTRAINT "FK_affiliate_documents_affiliates";
            ALTER TABLE beneficiaries.affiliate_documents ADD CONSTRAINT "FK_affiliate_documents_affiliates" FOREIGN KEY (affiliate_id) REFERENCES beneficiaries.affiliates(id) ON DELETE CASCADE;

            ALTER TABLE beneficiaries.affiliate_file_dossiers DROP CONSTRAINT "FK_affiliate_file_dossiers_affiliates";
            ALTER TABLE beneficiaries.affiliate_file_dossiers ADD CONSTRAINT "FK_affiliate_file_dossiers_affiliates" FOREIGN KEY (affiliate_id) REFERENCES beneficiaries.affiliates(id) ON DELETE CASCADE;

            ALTER TABLE beneficiaries.person_fingerprints DROP CONSTRAINT "FK_fingerprint_person";
            ALTER TABLE beneficiaries.person_fingerprints ADD CONSTRAINT "FK_fingerprint_person" FOREIGN KEY (person_id) REFERENCES beneficiaries.persons(id) ON DELETE CASCADE;
         `);
    await queryRunner.query(`
            ALTER TABLE beneficiaries.persons
                ALTER COLUMN account_number TYPE BIGINT USING account_number::BIGINT,
                ALTER COLUMN cell_phone_number TYPE VARCHAR(255) USING cell_phone_number::VARCHAR(255),
                ALTER COLUMN death_certificate_number TYPE VARCHAR(255) USING death_certificate_number::VARCHAR(255),
                ALTER COLUMN first_name TYPE VARCHAR(255) USING first_name::VARCHAR(255),
                ALTER COLUMN id TYPE bigint USING id::bigint,
                ALTER COLUMN identity_card TYPE VARCHAR(255) USING identity_card::VARCHAR(255),
                ALTER COLUMN last_name TYPE VARCHAR(255) USING last_name::VARCHAR(255),
                ALTER COLUMN mothers_last_name TYPE VARCHAR(255) USING mothers_last_name::VARCHAR(255),
                ALTER COLUMN nua TYPE BIGINT USING nua::BIGINT,
                ALTER COLUMN phone_number TYPE VARCHAR(255) USING phone_number::VARCHAR(255),
                ALTER COLUMN reason_death TYPE VARCHAR(255) USING reason_death::VARCHAR(255),
                ALTER COLUMN second_name TYPE VARCHAR(255) USING second_name::VARCHAR(255),
                ALTER COLUMN sigep_status TYPE VARCHAR(255) USING sigep_status::VARCHAR(255),
                ALTER COLUMN surname_husband TYPE VARCHAR(255) USING surname_husband::VARCHAR(255);
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE beneficiaries.affiliate_documents DROP CONSTRAINT "FK_affiliate_documents_affiliates";
            ALTER TABLE beneficiaries.affiliate_documents ADD CONSTRAINT "FK_affiliate_documents_affiliates" FOREIGN KEY (affiliate_id) REFERENCES beneficiaries.affiliates(id) ON DELETE RESTRICT;

            ALTER TABLE beneficiaries.affiliate_file_dossiers DROP CONSTRAINT "FK_affiliate_file_dossiers_affiliates";
            ALTER TABLE beneficiaries.affiliate_file_dossiers ADD CONSTRAINT "FK_affiliate_file_dossiers_affiliates" FOREIGN KEY (affiliate_id) REFERENCES beneficiaries.affiliates(id) ON DELETE RESTRICT;

            ALTER TABLE beneficiaries.person_fingerprints DROP CONSTRAINT "FK_fingerprint_person";
            ALTER TABLE beneficiaries.person_fingerprints ADD CONSTRAINT "FK_fingerprint_person" FOREIGN KEY (person_id) REFERENCES beneficiaries.persons(id) ON DELETE RESTRICT;
         `);
  }
}
