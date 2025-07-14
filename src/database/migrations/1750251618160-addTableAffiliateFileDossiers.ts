import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddTableAffiliateFileDossiers1750251618160 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'beneficiaries.affiliate_file_dossiers',
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
            name: 'file_dossier_id',
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

    await queryRunner.createForeignKey(
      'beneficiaries.affiliate_file_dossiers',
      new TableForeignKey({
        name: 'FK_affiliate_file_dossiers_affiliates',
        columnNames: ['affiliate_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'beneficiaries.affiliates',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'beneficiaries.affiliate_file_dossiers',
      'FK_affiliate_file_dossiers_affiliates',
    );
    await queryRunner.dropTable('beneficiaries.affiliate_file_dossiers', true);
  }
}
