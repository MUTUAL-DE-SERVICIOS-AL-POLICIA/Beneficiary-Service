import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnEmailPerson1765826222446 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'beneficiaries.persons',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('beneficiaries.persons', 'email');
  }
}
