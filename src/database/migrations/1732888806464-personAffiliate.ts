import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class personAffiliate1732888806464 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'beneficiaries',
        name: 'person_affiliates',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['affiliates', 'persons'],
          },
          {
            name: 'type_id',
            type: 'int',
          },
          {
            name: 'kinship_type',
            type: 'int',
          },
          {
            name: 'state',
            type: 'boolean',
          },
          {
            name: 'person_id',
            type: 'int',
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
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('beneficiaries.person_affiliates');
  }
}
