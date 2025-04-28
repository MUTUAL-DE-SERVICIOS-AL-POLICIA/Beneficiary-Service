import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class BeneficiaryAddUuidAffiliatesAndSpouse1738340797410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    const hasColumn = await queryRunner.hasColumn('public.affiliates', 'uuid_reference');
    if(!hasColumn){
      await queryRunner.addColumn(
        'public.affiliates',
        new TableColumn({
          name: 'uuid_reference', // Nombre de la columna
          type: 'UUID', // Tipo de dato
          isNullable: false,
          default: 'uuid_generate_v4()', // Valor por defecto
        }),
      );
    }
    const hasColumn2 = await queryRunner.hasColumn('public.spouses', 'uuid_column');
    if(!hasColumn2){
      await queryRunner.addColumn(
        'public.spouses',
        new TableColumn({
          name: 'uuid_column', // Nombre de la columna
          type: 'UUID', // Tipo de dato
          isNullable: false,
          default: 'uuid_generate_v4()', // Valor por defecto
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('public.affiliates', 'uuid_reference');
  }
}
