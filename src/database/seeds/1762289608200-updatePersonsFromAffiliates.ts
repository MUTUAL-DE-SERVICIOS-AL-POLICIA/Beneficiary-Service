import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Seeder } from 'typeorm-extension';

export class UpdatePersonsFromAffiliates1762289608200 implements Seeder {
  track = true;
  private readonly logger = new Logger('UpdatePersonsFromAffiliates');

  public async run(dataSource: DataSource): Promise<any> {
    await dataSource.manager.transaction(async (manager) => {
      const updated = await manager.query(`
        WITH updated_rows AS (
          UPDATE beneficiaries.persons p
          SET
              city_birth_id           = a.city_birth_id,
              pension_entity_id       = a.pension_entity_id,
              financial_entity_id     = a.financial_entity_id,
              first_name              = a.first_name,
              second_name             = a.second_name,
              last_name               = a.last_name,
              mothers_last_name       = a.mothers_last_name,
              surname_husband         = a.surname_husband,
              identity_card           = a.identity_card,
              due_date                = a.due_date,
              is_duedate_undefined    = a.is_duedate_undefined,
              gender                  = a.gender,
              civil_status            = a.civil_status,
              birth_date              = a.birth_date,
              date_death              = a.date_death,
              death_certificate_number= a.death_certificate_number,
              reason_death            = a.reason_death,
              phone_number            = a.phone_number,
              cell_phone_number       = a.cell_phone_number,
              nua                     = a.nua,
              account_number          = a.account_number,
              sigep_status            = a.sigep_status,
              id_person_senasir       = a.id_person_senasir,
              updated_at              = NOW()
          FROM public.affiliates a
          WHERE p.uuid_column = a.uuid_reference
          AND (
                  p.city_birth_id IS DISTINCT FROM a.city_birth_id OR
                  p.pension_entity_id IS DISTINCT FROM a.pension_entity_id OR
                  p.financial_entity_id IS DISTINCT FROM a.financial_entity_id OR
                  p.first_name IS DISTINCT FROM a.first_name OR
                  p.second_name IS DISTINCT FROM a.second_name OR
                  p.last_name IS DISTINCT FROM a.last_name OR
                  p.mothers_last_name IS DISTINCT FROM a.mothers_last_name OR
                  p.surname_husband IS DISTINCT FROM a.surname_husband OR
                  p.identity_card IS DISTINCT FROM a.identity_card OR
                  p.due_date IS DISTINCT FROM a.due_date OR
                  p.is_duedate_undefined IS DISTINCT FROM a.is_duedate_undefined OR
                  p.gender IS DISTINCT FROM a.gender OR
                  p.civil_status IS DISTINCT FROM a.civil_status OR
                  p.birth_date IS DISTINCT FROM a.birth_date OR
                  p.date_death IS DISTINCT FROM a.date_death OR
                  p.death_certificate_number IS DISTINCT FROM a.death_certificate_number OR
                  p.reason_death IS DISTINCT FROM a.reason_death OR
                  p.phone_number IS DISTINCT FROM a.phone_number OR
                  p.cell_phone_number IS DISTINCT FROM a.cell_phone_number OR
                  p.nua IS DISTINCT FROM a.nua OR
                  p.account_number IS DISTINCT FROM a.account_number OR
                  p.sigep_status IS DISTINCT FROM a.sigep_status OR
                  p.id_person_senasir IS DISTINCT FROM a.id_person_senasir
              )
          RETURNING p.uuid_column
        )
        SELECT COUNT(*) AS updated_count FROM updated_rows;
      `);

      const count = updated[0]?.updated_count ?? 0;
      this.logger.log(`Se actualizaron ${count} registros correctamente dentro de la transacción.`);
    });
  }
}
 // yarn seed:run --name src/database/seeds/1762289608200-updatePersonsFromAffiliates.ts
