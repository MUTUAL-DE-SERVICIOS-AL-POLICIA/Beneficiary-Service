import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class personRelations1732890554525 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey(
      'beneficiaries.person_affiliates',
      new TableForeignKey({
        name: 'FK_person_affiliates',
        columnNames: ['person_id'],
        referencedTableName: 'beneficiaries.persons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKeys('beneficiaries.person_fingerprints', [
      new TableForeignKey({
        name: 'FK_fingerprint_person',
        columnNames: ['person_id'],
        referencedTableName: 'beneficiaries.persons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_fingerprint_fingerprint_type',
        columnNames: ['fingerprint_type_id'],
        referencedTableName: 'beneficiaries.fingerprint_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('beneficiaries.person_affiliates', 'FK_person_affiliates');
    await queryRunner.dropForeignKey('beneficiaries.person_fingerprints', 'FK_fingerprint_person');
    await queryRunner.dropForeignKey(
      'beneficiaries.person_fingerprints',
      'FK_fingerprint_fingerprint_type',
    );
  }
}
