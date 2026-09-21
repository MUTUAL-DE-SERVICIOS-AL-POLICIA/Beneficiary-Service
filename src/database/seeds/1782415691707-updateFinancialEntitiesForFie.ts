import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

const LOCAL_TIMESTAMP = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')";

export class UpdateFinancialEntitiesForFie1782415691707 implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<any> {
    await dataSource.manager.transaction(async (manager) => {
      // FIE estaba duplicado como entidad financiera 13 y 14. Este seeder
      // normaliza las personas que apuntan al 14 para que apunten al 13.
      await manager.query(`
        UPDATE beneficiaries.persons
        SET financial_entity_id = 13,
            updated_at = ${LOCAL_TIMESTAMP}
        WHERE financial_entity_id = 14
      `);
    });
  }
}
