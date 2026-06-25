import { MigrationInterface, QueryRunner } from 'typeorm';

const LOCAL_TIMESTAMP = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')";

export class UpdateFinancialEntitiesIdFie1782412335920 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // FIE estaba duplicado como entidad financiera 13 y 14. Se normalizan
    // las personas que apuntaban al 14 hacia el 13 y se guarda respaldo
    // para que el rollback solo revierta los registros afectados.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS beneficiaries.persons_financial_entity_14_to_13_migration (
        person_id integer PRIMARY KEY
      )
    `);

    await queryRunner.query(`
      INSERT INTO beneficiaries.persons_financial_entity_14_to_13_migration (person_id)
      SELECT id
      FROM beneficiaries.persons
      WHERE financial_entity_id = 14
      ON CONFLICT (person_id) DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE beneficiaries.persons
      SET financial_entity_id = 13,
          updated_at = ${LOCAL_TIMESTAMP}
      WHERE financial_entity_id = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE beneficiaries.persons
      SET financial_entity_id = 14,
          updated_at = ${LOCAL_TIMESTAMP}
      WHERE financial_entity_id = 13
        AND id IN (
          SELECT person_id
          FROM beneficiaries.persons_financial_entity_14_to_13_migration
        )
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS beneficiaries.persons_financial_entity_14_to_13_migration
    `);
  }
}
