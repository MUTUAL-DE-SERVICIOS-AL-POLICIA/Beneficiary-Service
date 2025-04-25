import { MigrationInterface, QueryRunner } from 'typeorm';

export class BeneficiaryAddAffiliateToPersonAndPersonAffiliateTrigger1738674669858
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION beneficiaries.replicate_affiliates_to_persons_and_persons_aff() RETURNS TRIGGER AS $$
            DECLARE
                new_person_id bigint;
            begin
                RAISE NOTICE 'Ejecutando Trigger de actualización, affiliado a person';
                IF current_setting('session_replication_role') = 'origin' THEN
                    PERFORM set_config('session_replication_role', 'replica', true);
                
                    IF TG_OP = 'INSERT' THEN
                        PERFORM setval('beneficiaries.persons_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.persons), false);
                        INSERT INTO beneficiaries.persons (city_birth_id,
                                pension_entity_id, financial_entity_id,
                                first_name, second_name, last_name,
                                mothers_last_name, surname_husband,
                                identity_card, due_date, is_duedate_undefined,
                                gender, civil_status, birth_date,
                                date_death, death_certificate_number,
                                reason_death, phone_number, cell_phone_number,
                                nua, account_number, sigep_status,
                                id_person_senasir, date_last_contribution,
                                created_at, updated_at, deleted_at, uuid_column 
                                )
                            VALUES (
                                    NEW.city_birth_id::int8,
                                    NEW.pension_entity_id::int8,
                                    NEW.financial_entity_id::int8,
                                    NEW.first_name::varchar(255),
                                    NEW.second_name::varchar(255),
                                    NEW.last_name::varchar(255),
                                    NEW.mothers_last_name::varchar(255),
                                    NEW.surname_husband::varchar(255),
                                    NEW.identity_card::varchar(255),
                                    NEW.due_date::date,
                                    NEW.is_duedate_undefined::bool,
                                    NEW.gender::varchar(255),
                                    NEW.civil_status::varchar(255),
                                    NEW.birth_date::date,
                                    NEW.date_death::date,
                                    NEW.death_certificate_number::varchar(255),
                                    NEW.reason_death::varchar(255),
                                    NEW.phone_number::varchar(255),
                                    NEW.cell_phone_number::varchar(255),
                                    NEW.nua::int8,
                                    NEW.account_number::bigint,
                                    NEW.sigep_status::varchar(255),
                                    NEW.id_person_senasir::int4,
                                    NEW.date_last_contribution::date,
                                    NEW.created_at::timestamp,
                                    NEW.updated_at::timestamp,
                                    NEW.deleted_at::timestamp,
                                    NEW.uuid_reference::UUID
                            )
                            RETURNING id INTO new_person_id;
                        PERFORM setval('beneficiaries.affiliates_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.affiliates), false);
                        INSERT INTO beneficiaries.affiliates (id, registration,
                                    type, date_entry, date_derelict, reason_derelict,
                                    service_years, service_months, unit_police_description,
                                    affiliate_state_id,
                                    created_at, updated_at
                                    )
                            VALUES (
                                    NEW.id::int8,
                                    NEW.registration::varchar(255),
                                    NEW.type::varchar(255),
                                    NEW.date_entry::date,
                                    NEW.date_derelict::date,
                                    NEW.reason_derelict::varchar(255),
                                    NEW.service_years::int4,
                                    NEW.service_months::int4,
                                    NEW.unit_police_description::varchar(255),
                                    NEW.affiliate_state_id::int8,
                                    NEW.created_at::timestamp,
                                    NEW.updated_at::timestamp
                                );
                        insert into beneficiaries.person_affiliates (person_id, type, type_id,
                                                                    state, kinship_type)
                            values (
                                    new_person_id,
                                    'affiliate',
                                    NEW.id::int8,
                                    true,
                                    1
                                );
                    ELSIF TG_OP = 'UPDATE' then
                        RAISE NOTICE 'Se esta actualizando, affiliado a person ';
                        IF EXISTS (SELECT 1 FROM beneficiaries.persons WHERE uuid_column = NEW.uuid_reference) then
                            RAISE NOTICE 'Si existe el registro';
                            UPDATE beneficiaries.persons
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
                            WHERE uuid_column = NEW.uuid_reference;
                        
                            update beneficiaries.affiliates 
                            set 
                                registration = NEW.registration::varchar(255),
                                type = NEW.type::varchar(255),
                                date_entry = NEW.date_entry::date,
                                date_derelict = NEW.date_derelict::date,
                                reason_derelict = NEW.reason_derelict::varchar(255),
                                service_years = NEW.service_years::int4,
                                service_months = NEW.service_months::int4,
                                unit_police_description = NEW.unit_police_description::varchar(255),
                                affiliate_state_id = NEW.affiliate_state_id::int8,
                                created_at = NEW.created_at::timestamp,
                                updated_at = NEW.updated_at::timestamp,
                                deleted_at = NEW.deleted_at::timestamp
                            where id = new.id;
                            RAISE NOTICE 'se actualizo correctamente';
                        else 
                            RAISE NOTICE 'Se creará un nuevo registro';
                            PERFORM setval('beneficiaries.persons_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.persons), false);
                            INSERT INTO beneficiaries.persons (city_birth_id,
                                pension_entity_id, financial_entity_id,
                                first_name, second_name, last_name,
                                mothers_last_name, surname_husband,
                                identity_card, due_date, is_duedate_undefined,
                                gender, civil_status, birth_date,
                                date_death, death_certificate_number,
                                reason_death, phone_number, cell_phone_number,
                                nua, account_number, sigep_status,
                                id_person_senasir, date_last_contribution,
                                created_at, updated_at, deleted_at, uuid_column
                                )
                            VALUES (
                                    NEW.city_birth_id::int8,
                                    NEW.pension_entity_id::int8,
                                    NEW.financial_entity_id::int8,
                                    NEW.first_name::varchar(255),
                                    NEW.second_name::varchar(255),
                                    NEW.last_name::varchar(255),
                                    NEW.mothers_last_name::varchar(255),
                                    NEW.surname_husband::varchar(255),
                                    NEW.identity_card::varchar(255),
                                    NEW.due_date::date,
                                    NEW.is_duedate_undefined::bool,
                                    NEW.gender::varchar(255),
                                    NEW.civil_status::varchar(255),
                                    NEW.birth_date::date,
                                    NEW.date_death::date,
                                    NEW.death_certificate_number::varchar(255),
                                    NEW.reason_death::varchar(255),
                                    NEW.phone_number::varchar(255),
                                    NEW.cell_phone_number::varchar(255),
                                    NEW.nua::int8,
                                    NEW.account_number::bigint,
                                    NEW.sigep_status::varchar(255),
                                    NEW.id_person_senasir::int4,
                                    NEW.date_last_contribution::date,
                                    NEW.created_at::timestamp,
                                    NEW.updated_at::timestamp,
                                    NEW.deleted_at::timestamp,
                                    NEW.uuid_reference::UUID
                            )
                            RETURNING id INTO new_person_id;
                            PERFORM setval('beneficiaries.affiliates_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.affiliates), false);
                            INSERT INTO beneficiaries.affiliates (id, registration,
                                    type, date_entry, date_derelict, reason_derelict,
                                    service_years, service_months, unit_police_description, affiliate_state_id,
                                    created_at, updated_at
                                    )
                                VALUES (
                                        NEW.id::int8,
                                        NEW.registration::varchar(255),
                                        NEW.type::varchar(255),
                                        NEW.date_entry::date,
                                        NEW.date_derelict::date,
                                        NEW.reason_derelict::varchar(255),
                                        NEW.service_years::int4,
                                        NEW.service_months::int4,
                                        NEW.unit_police_description::varchar(255),
                                        NEW.affiliate_state_id::int8,
                                        NEW.created_at::timestamp,
                                        NEW.updated_at::timestamp
                                );
                            insert into beneficiaries.person_affiliates (person_id, type, type_id,
                                                                    state, kinship_type)
                            values (
                                    new_person_id,
                                    'affiliate',
                                    NEW.id::int8,
                                    true,
                                    1
                                );
                            RAISE NOTICE 'Se creó persona correctamente';
                        end if;
                    END IF;
                PERFORM set_config('session_replication_role', 'origin', true);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;    
        `);
    await queryRunner.query(`
            CREATE TRIGGER trg_replicate_affiliates_to_persons_and_persons_aff
            AFTER INSERT OR UPDATE OR DELETE ON public.affiliates
            FOR EACH ROW EXECUTE FUNCTION beneficiaries.replicate_affiliates_to_persons_and_persons_aff();   
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TRIGGER trg_replicate_affiliates_to_persons_and_persons_aff ON public.affiliates;    
    `);
  }
}
