import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChangeDateLastContributionsTable1756391670624 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('beneficiaries.persons', 'date_last_contribution');
    await queryRunner.addColumns('beneficiaries.affiliates', [
      new TableColumn({
        name: 'date_last_contribution',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({
        name: 'date_entry_reinstatement',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({
        name: 'date_derelict_reinstatement',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({
        name: 'date_last_contribution_reinstatement',
        type: 'date',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('affiliates', [
      'date_last_contribution',
      'date_entry_reinstatement',
      'date_derelict_reinstatement',
      'date_last_contribution_reinstatement',
    ]);
    await queryRunner.addColumn(
      'persons',
      new TableColumn({
        name: 'date_last_contribution',
        type: 'date',
        isNullable: true,
      }),
    );
  }
}
