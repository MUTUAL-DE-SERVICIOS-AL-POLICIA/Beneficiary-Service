import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueKeyInAffiliateDocuments1760450375072 implements MigrationInterface {
  name = 'UniqueKeyInAffiliateDocuments1760450375072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM beneficiaries.affiliate_documents ad
        USING beneficiaries.affiliate_documents ad2
        WHERE ad.affiliate_id = ad2.affiliate_id
        AND ad.procedure_document_id = ad2.procedure_document_id
        AND ad.id > ad2.id;
    `);

    await queryRunner.query(`
        ALTER TABLE beneficiaries.affiliate_documents
        ADD CONSTRAINT unique_affiliate_document
        UNIQUE (affiliate_id, procedure_document_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE beneficiaries.affiliate_documents
        DROP CONSTRAINT IF EXISTS unique_affiliate_document;
    `);
  }
}
