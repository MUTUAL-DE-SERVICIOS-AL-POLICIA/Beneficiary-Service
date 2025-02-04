import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class BeneficiaryAffiliate1732733457608 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'beneficiaries',
        name: 'affiliates',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'degree_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'unit_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'category_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'registration',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date_entry',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'date_derelict',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'reason_derelict',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'service_years',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'service_months',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'unit_police_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'official',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'book',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'departure',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'marriage_date',
            type: 'date',
            isNullable: true,
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
          {
            name: 'affiliate_state_id',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('beneficiaries.affiliates');
  }
}
