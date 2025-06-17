import { MigrationInterface, QueryRunner } from 'typeorm';

export class BeneficiaryAddSpouseToPersonTrigger1738674910622 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION beneficiaries.replicate_spouses_to_persons() RETURNS TRIGGER AS $$
            DECLARE
                new_person_id bigint;
                uuid_column_new_person uuid;
                found_person_uuid uuid;
                found_affiliate_uuid uuid;
                found_person_affiliate_id bigint;
            begin
                RAISE NOTICE 'Ejecutando Trigger de actualización, spouse a person';
                IF current_setting('session_replication_role') = 'origin' THEN
                    PERFORM set_config('session_replication_role', 'replica', true);

                    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.identity_card IS NOT NULL THEN

                        -- Buscar si ya existe como afiliado
                        SELECT uuid_reference INTO found_person_uuid
                        FROM public.affiliates
                        WHERE identity_card = NEW.identity_card
                        LIMIT 1;

                        -- Si no está como afiliado, buscar en persons
                        IF found_person_uuid IS NULL THEN
                            SELECT uuid_column INTO found_person_uuid
                            FROM beneficiaries.persons
                            WHERE identity_card = NEW.identity_card
                            LIMIT 1;
                        END IF;

                        IF found_person_uuid IS NOT NULL THEN
                            UPDATE beneficiaries.persons
                            SET
                                city_birth_id = NEW.city_birth_id,
                                first_name = NEW.first_name,
                                second_name = NEW.second_name,
                                last_name = NEW.last_name,
                                mothers_last_name = NEW.mothers_last_name,
                                surname_husband = NEW.surname_husband,
                                identity_card = NEW.identity_card,
                                due_date = NEW.due_date,
                                is_duedate_undefined = NEW.is_duedate_undefined,
                                civil_status = NEW.civil_status,
                                birth_date = NEW.birth_date,
                                date_death = NEW.date_death,
                                death_certificate_number = NEW.death_certificate_number,
                                reason_death = NEW.reason_death,
                                created_at = NEW.created_at,
                                updated_at = NEW.updated_at,
                                deleted_at = NEW.deleted_at
                            WHERE uuid_column = found_person_uuid
                            RETURNING id, uuid_column INTO new_person_id, uuid_column_new_person;
                        ELSIF TG_OP = 'UPDATE' THEN
                            UPDATE beneficiaries.persons
                                SET
                                    city_birth_id = NEW.city_birth_id,
                                    first_name = NEW.first_name,
                                    second_name = NEW.second_name,
                                    last_name = NEW.last_name,
                                    mothers_last_name = NEW.mothers_last_name,
                                    surname_husband = NEW.surname_husband,
                                    identity_card = NEW.identity_card,
                                    due_date = NEW.due_date,
                                    is_duedate_undefined = NEW.is_duedate_undefined,
                                    civil_status = NEW.civil_status,
                                    birth_date = NEW.birth_date,
                                    date_death = NEW.date_death,
                                    death_certificate_number = NEW.death_certificate_number,
                                    reason_death = NEW.reason_death,
                                    created_at = NEW.created_at,
                                    updated_at = NEW.updated_at,
                                    deleted_at = NEW.deleted_at
                                WHERE uuid_column = NEW.uuid_column
                                RETURNING id, uuid_column INTO new_person_id, uuid_column_new_person;
                        ELSE
                            -- Insertar nueva persona
                            PERFORM setval('beneficiaries.persons_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.persons), false);
                            INSERT INTO beneficiaries.persons (
                                city_birth_id, first_name, second_name, last_name,
                                mothers_last_name, surname_husband, identity_card,
                                due_date, is_duedate_undefined, civil_status,
                                birth_date, date_death, death_certificate_number,
                                reason_death, created_at, updated_at, deleted_at, uuid_column
                            )
                            VALUES (
                                NEW.city_birth_id, NEW.first_name, NEW.second_name, NEW.last_name,
                                NEW.mothers_last_name, NEW.surname_husband, NEW.identity_card,
                                NEW.due_date, NEW.is_duedate_undefined, NEW.civil_status,
                                NEW.birth_date, NEW.date_death, NEW.death_certificate_number,
                                NEW.reason_death, NEW.created_at, NEW.updated_at, NEW.deleted_at, NEW.uuid_column
                            )
                            RETURNING id, uuid_column INTO new_person_id, uuid_column_new_person;
                        END IF;

                        UPDATE public.spouses
                        SET uuid_column = uuid_column_new_person
                        WHERE id = NEW.id AND uuid_column IS DISTINCT FROM uuid_column_new_person;

                        -- Crear relación
                        --buscamos al afiliados y sacamos su uuid
                        SELECT uuid_reference INTO found_affiliate_uuid
                        FROM public.affiliates
                        WHERE id = NEW.affiliate_id
                        LIMIT 1;

                        -- Obtener ID de persona del afiliado
                        SELECT id INTO found_person_affiliate_id
                        FROM beneficiaries.persons
                        WHERE uuid_column = found_affiliate_uuid
                        LIMIT 1;

                        -- Primero: Desactivar TODAS las relaciones de cónyuge (tipo 10) del afiliado
                        UPDATE beneficiaries.person_affiliates
                        SET state = false
                        WHERE 
                            type = 'persons' AND
                            type_id = found_person_affiliate_id AND  -- ID del afiliado como persona
                            kinship_type = 10;

                        -- Segundo: Desactivar TODAS las relaciones de cónyuge (tipo 10) de la esposa
                        UPDATE beneficiaries.person_affiliates
                        SET state = false
                        WHERE 
                            person_id = new_person_id AND
                            type = 'persons' AND
                            kinship_type = 10;

                        -- Tercero: Verificar si la nueva persona ya tenía relación con el afiliado
                        UPDATE beneficiaries.person_affiliates
                        SET 
                            state = true,
                            updated_at = NOW()
                        WHERE 
                            person_id = new_person_id AND
                            type = 'persons' AND
                            type_id = found_person_affiliate_id AND
                            kinship_type = 10;

                        -- Si no existía relación previa, insertar nueva
                        IF NOT FOUND THEN
                            INSERT INTO beneficiaries.person_affiliates (
                                person_id, 
                                type, 
                                type_id, 
                                state, 
                                kinship_type,
                                created_at,
                                updated_at
                            ) VALUES (
                                new_person_id, 
                                'persons', 
                                found_person_affiliate_id, 
                                true, 
                                10,
                                NOW(),
                                NOW()
                            );
                        END IF;
                    ELSIF TG_OP = 'DELETE' THEN
                        DELETE FROM beneficiaries.persons WHERE uuid_column = OLD.uuid_column;
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
        DROP TRIGGER IF EXISTS trg_replicate_spouses_to_persons ON public.spouses;
    `);

    await queryRunner.query(`
        DROP FUNCTION IF EXISTS beneficiaries.replicate_spouses_to_persons;
    `);
  }
}
