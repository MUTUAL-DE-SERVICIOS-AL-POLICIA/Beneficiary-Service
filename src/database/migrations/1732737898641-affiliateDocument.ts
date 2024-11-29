import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class affiliateDocument1732737898641 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear la tabla
    await queryRunner.createTable(
      new Table({
        name: 'beneficiaries.affiliate_documents',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'affiliate_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'procedure_document_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'path',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la tabla
    await queryRunner.dropTable('beneficiaries.affiliate_documents', true);
  }
}
