import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class CreateColumnAttemptsPersonFingerprints1736952591955 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'beneficiaries.person_fingerprints',
      new TableColumn({
        name: 'attempts',
        type: 'int',
        default: 1,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('beneficiaries.person_fingerprints', 'attempts');
  }
}
