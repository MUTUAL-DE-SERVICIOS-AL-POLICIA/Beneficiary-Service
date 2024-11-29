import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class person1732886934209 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'beneficiaries',
        name: 'persons',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid_column',
            type: 'uuid',
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'city_birth_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'pension_entity_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'financial_entity_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'first_name',
            type: 'text',
          },
          {
            name: 'second_name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mothers_last_name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'surname_husband',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'identity_card',
            type: 'text',
          },
          {
            name: 'due_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'is_duedate_undefined',
            type: 'boolean',
            default: false,
          },
          {
            name: 'gender',
            type: 'char',
            length: '1',
            isNullable: true,
          },
          {
            name: 'civil_status',
            type: 'char',
            length: '1',
            isNullable: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'date_death',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'death_certificate_number',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reason_death',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cell_phone_number',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'nua',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'account_number',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sigep_status',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'id_person_senasir',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'date_last_contribution',
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
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('beneficiaries.persons');
  }
}
