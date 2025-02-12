import { MigrationInterface, QueryRunner } from 'typeorm';

export class BeneficiaryAddSpouseToPersonTrigger1738674910622 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION beneficiaries.replicate_spouses_to_persons() RETURNS TRIGGER AS $$
            DECLARE
                new_person_id bigint;
            begin
                RAISE NOTICE 'Ejecutando Trigger de actualización, spouse a person';
                IF current_setting('session_replication_role') = 'origin' THEN
                    PERFORM set_config('session_replication_role', 'replica', true);
                
                    IF TG_OP = 'INSERT' THEN
                        PERFORM setval('beneficiaries.persons_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.persons), false);
                        INSERT INTO beneficiaries.persons (city_birth_id,
                                first_name, second_name, last_name,
                                mothers_last_name, surname_husband,
                                identity_card, due_date, is_duedate_undefined,
                                civil_status, birth_date,
                                date_death, death_certificate_number,
                                reason_death,										
                                created_at, updated_at, deleted_at, uuid_column 
                                )
                            VALUES (
                                    NEW.city_birth_id::int8,			
                                    NEW.first_name::varchar(255),
                                    NEW.second_name::varchar(255),
                                    NEW.last_name::varchar(255),
                                    NEW.mothers_last_name::varchar(255),
                                    NEW.surname_husband::varchar(255),
                                    NEW.identity_card::varchar(255),
                                    NEW.due_date::date,
                                    NEW.is_duedate_undefined::bool,						
                                    NEW.civil_status::varchar(255),
                                    NEW.birth_date::date,
                                    NEW.date_death::date,
                                    NEW.death_certificate_number::varchar(255),
                                    NEW.reason_death::varchar(255),						
                                    NEW.created_at::timestamp,
                                    NEW.updated_at::timestamp,
                                    NEW.deleted_at::timestamp,
                                    NEW.uuid_column::UUID
                            )
                            RETURNING id INTO new_person_id;
                        insert into beneficiaries.person_affiliate (person_id, type, type_id,
                                                                    state, kinship_type)
                            values (
                                    new_person_id,
                                    'persons',
                                    NEW.affiliate_id::int8,
                                    true,
                                    10
                                );
                    ELSIF TG_OP = 'UPDATE' then
                        RAISE NOTICE 'Se esta actualizando, spouse a person ';
                        IF EXISTS (SELECT 1 FROM beneficiaries.persons WHERE uuid_column = NEW.uuid_column) then
                            RAISE NOTICE 'Si existe el registro';
                            UPDATE beneficiaries.persons
                            SET 
                                    city_birth_id = NEW.city_birth_id::int8,			
                                    first_name = NEW.first_name::varchar(255),
                                    second_name = NEW.second_name::varchar(255),
                                    last_name = NEW.last_name::varchar(255),
                                    mothers_last_name = NEW.mothers_last_name::varchar(255),
                                    surname_husband = NEW.surname_husband::varchar(255),
                                    identity_card = NEW.identity_card::varchar(255),
                                    due_date = NEW.due_date::date,
                                    is_duedate_undefined = NEW.is_duedate_undefined::bool,						
                                    civil_status = NEW.civil_status::varchar(255),
                                    birth_date = NEW.birth_date::date,
                                    date_death = NEW.date_death::date,
                                    death_certificate_number = NEW.death_certificate_number::varchar(255),
                                    reason_death = NEW.reason_death::varchar(255),						
                                    created_at = NEW.created_at::timestamp,
                                    updated_at = NEW.updated_at::timestamp,
                                    deleted_at = NEW.deleted_at::timestamp
                            WHERE uuid_column = NEW.uuid_column;
                        
                            RAISE NOTICE 'se actualizo correctamente';
                        else 
                            RAISE NOTICE 'Se creará un nuevo registro';
                            PERFORM setval('beneficiaries.persons_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.persons), false);
                            INSERT INTO beneficiaries.persons (city_birth_id,
                                first_name, second_name, last_name,
                                mothers_last_name, surname_husband,
                                identity_card, due_date, is_duedate_undefined,
                                civil_status, birth_date,
                                date_death, death_certificate_number,
                                reason_death,										
                                created_at, updated_at, deleted_at, uuid_column 
                                )
                            VALUES (
                                    NEW.city_birth_id::int8,			
                                    NEW.first_name::varchar(255),
                                    NEW.second_name::varchar(255),
                                    NEW.last_name::varchar(255),
                                    NEW.mothers_last_name::varchar(255),
                                    NEW.surname_husband::varchar(255),
                                    NEW.identity_card::varchar(255),
                                    NEW.due_date::date,
                                    NEW.is_duedate_undefined::bool,						
                                    NEW.civil_status::varchar(255),
                                    NEW.birth_date::date,
                                    NEW.date_death::date,
                                    NEW.death_certificate_number::varchar(255),
                                    NEW.reason_death::varchar(255),						
                                    NEW.created_at::timestamp,
                                    NEW.updated_at::timestamp,
                                    NEW.deleted_at::timestamp,
                                    NEW.uuid_column::UUID
                            )
                            RETURNING id INTO new_person_id;
                        insert into beneficiaries.person_affiliate (person_id, type, type_id,
                                                                    state, kinship_type)
                            values (
                                    new_person_id,
                                    'persons',
                                    NEW.affiliate_id::int8,
                                    true,
                                    10
                                );
                            RAISE NOTICE 'Se creó persona correctamente';
                        end if;
                    ELSIF TG_OP = 'DELETE' THEN
                        DELETE FROM beneficiaries.persons WHERE id = OLD.id;
                    END IF;
                PERFORM set_config('session_replication_role', 'origin', true);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;   
        `);
    await queryRunner.query(`
            CREATE TRIGGER trg_replicate_spouses_to_persons
            AFTER INSERT OR UPDATE OR DELETE ON public.spouses
            FOR EACH ROW EXECUTE FUNCTION beneficiaries.replicate_spouses_to_persons();   
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TRIGGER trg_replicate_spouses_to_persons ON public.spouses;    
    `);
  }
}
