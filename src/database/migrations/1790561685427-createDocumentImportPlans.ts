import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentImportPlans1790561685427 implements MigrationInterface {
  name = 'CreateDocumentImportPlans1790561685427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE beneficiaries.document_import_plans (
        id uuid NOT NULL,
        owner_username varchar(255) NOT NULL,
        plan jsonb NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT document_import_plans_pkey PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX document_import_plans_expires_at_idx
      ON beneficiaries.document_import_plans (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE beneficiaries.document_import_plans');
  }
}
