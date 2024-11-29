import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class affiliateRelations1732817935542 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear la llave foránea entre affiliates y affiliate_states
    await queryRunner.createForeignKey(
      'beneficiaries.affiliates',
      new TableForeignKey({
        name: 'FK_affiliates_affiliate_states',
        columnNames: ['affiliate_state_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'beneficiaries.affiliate_states',
        onDelete: 'SET NULL',
      }),
    );

    // Crear la llave foránea entre affiliate_states y state type
    await queryRunner.createForeignKey(
      'beneficiaries.affiliate_states',
      new TableForeignKey({
        name: 'FK_affiliate_states_state_types',
        columnNames: ['state_type_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'beneficiaries.state_types',
        onDelete: 'SET NULL',
      }),
    );

    // Crear la llave foránea entre affiliate_documents y affiliates
    await queryRunner.createForeignKey(
      'beneficiaries.affiliate_documents',
      new TableForeignKey({
        name: 'FK_affiliate_documents_affiliates', // Nombre explícito de la llave foránea
        columnNames: ['affiliate_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'beneficiaries.affiliates',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la llave foránea entre affiliates y affiliate_states
    await queryRunner.dropForeignKey(
      'beneficiaries.affiliates',
      'FK_affiliates_affiliate_states', // Utiliza el nombre explícito definido al crear
    );

    // Eliminar la llave foránea entre affiliate_states y state types
    await queryRunner.dropForeignKey(
      'beneficiaries.affiliate_states',
      'FK_affiliate_states_state_types', // Utiliza el nombre explícito definido al crear
    );

    // Eliminar la llave foránea entre affiliate_documents y affiliates
    await queryRunner.dropForeignKey(
      'beneficiaries.affiliate_documents',
      'FK_affiliate_documents_affiliates', // Utiliza el nombre explícito definido al crear
    );
  }
}
