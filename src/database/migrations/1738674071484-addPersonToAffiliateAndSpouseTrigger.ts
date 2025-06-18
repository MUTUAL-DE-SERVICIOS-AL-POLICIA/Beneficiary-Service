import { MigrationInterface, QueryRunner } from 'typeorm';

export class BeneficiaryAddPersonToAffiliateAndSpouseTrigger1738674071484
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE FUNCTION beneficiaries.replicate_persons_to_affiliates_and_spouse() RETURNS TRIGGER AS $$
        begin
            RAISE NOTICE 'Ejecutando Trigger de actualización, person a affiliado';
            IF current_setting('session_replication_role') = 'origin' THEN
                PERFORM set_config('session_replication_role', 'replica', true);
                IF TG_OP = 'UPDATE' then
                    RAISE NOTICE 'Se esta actualizando, person a affiliado ';
                    UPDATE public.affiliates
                        SET 
                            city_birth_id = NEW.city_birth_id::int8,
                            pension_entity_id = NEW.pension_entity_id::int8,
                            financial_entity_id = NEW.financial_entity_id::int8,
                            first_name = NEW.first_name::varchar(255),
                            second_name = NEW.second_name::Varchar(255),
                            last_name = NEW.last_name::varchar(255),
                            mothers_last_name = NEW.mothers_last_name::varchar(255),
                            surname_husband = NEW.surname_husband::varchar(255),
                            identity_card = NEW.identity_card::varchar(255),
                            due_date = NEW.due_date::date,
                            is_duedate_undefined = NEW.is_duedate_undefined::bool,
                            gender = NEW.gender::varchar(255),
                            civil_status = NEW.civil_status::varchar(255),
                            birth_date = NEW.birth_date::date,
                            date_death = NEW.date_death::date,
                            death_certificate_number = NEW.death_certificate_number::varchar(255),
                            reason_death = NEW.reason_death::varchar(255),
                            phone_number = NEW.phone_number::varchar(255),
                            cell_phone_number = NEW.cell_phone_number::varchar(255),
                            nua = NEW.nua::int8,
                            account_number = NEW.account_number::int8,
                            sigep_status = NEW.sigep_status::varchar(255),
                            id_person_senasir = NEW.id_person_senasir::int4,
                            date_last_contribution = NEW.date_last_contribution::date,
                            created_at = NEW.created_at::timestamp,
                            updated_at = NEW.updated_at::timestamp,
                            deleted_at = NEW.deleted_at::timestamp
                        WHERE uuid_reference = NEW.uuid_column;
                    UPDATE public.spouses
                        SET 
                            birth_date = NEW.birth_date::date,
                            city_birth_id = NEW.city_birth_id::int8,
                            civil_status = NEW.civil_status::varchar(255),
                            date_death = NEW.date_death::date,
                            death_certificate_number = NEW.death_certificate_number::varchar(255),
                            reason_death = NEW.reason_death::varchar(255),
                            due_date = NEW.due_date::date,
                            is_duedate_undefined = NEW.is_duedate_undefined::bool,
                            first_name = NEW.first_name::varchar(255),
                            second_name = NEW.second_name::Varchar(255),
                            last_name = NEW.last_name::varchar(255),
                            mothers_last_name = NEW.mothers_last_name::varchar(255),
                            surname_husband = NEW.surname_husband::varchar(255),
                            identity_card = NEW.identity_card::varchar(255),
                            created_at = NEW.created_at::timestamp,
                            updated_at = NEW.updated_at::timestamp,
                            deleted_at = NEW.deleted_at::timestamp
                        WHERE uuid_column = NEW.uuid_column;
                END IF;

                PERFORM set_config('session_replication_role', 'origin', true);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;`);
    await queryRunner.query(`
        CREATE TRIGGER trg_replicate_persons_to_affiliates_and_spouse
        AFTER INSERT OR UPDATE OR DELETE ON beneficiaries.persons
        FOR EACH ROW EXECUTE FUNCTION beneficiaries.replicate_persons_to_affiliates_and_spouse();    
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_replicate_persons_to_affiliates_and_spouse ON beneficiaries.persons;    
    `);
  }
}
