import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTriggers1756407139523 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS persons_uuid_idx ON beneficiaries.persons (uuid_column);`,
    );
    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION beneficiaries.replicate_affiliates_to_persons_and_persons_aff()
        RETURNS trigger AS $$
        DECLARE
            new_person_id BIGINT;
			found_person_uuid UUID;
        BEGIN
            -- Evitar bucles de replicación
            IF current_setting('session_replication_role') = 'origin' THEN
                PERFORM set_config('session_replication_role', 'replica', true);

				
                IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
					
					IF NEW.identity_card IS NOT NULL THEN
						SELECT uuid_column, id INTO found_person_uuid, new_person_id
		                FROM beneficiaries.persons
						WHERE identity_card = NEW.identity_card
						LIMIT 1;
					END IF;

					IF found_person_uuid IS NOT NULL THEN
						UPDATE beneficiaries.persons
                                SET
									gender = NEW.gender,
                                    updated_at = NEW.updated_at,
									phone_number = NEW.phone_number,
			                        cell_phone_number = NEW.cell_phone_number,
			                        nua = NEW.nua,
			                        account_number = NEW.account_number,
			                        sigep_status = NEW.sigep_status,
			                        id_person_senasir = NEW.id_person_senasir
                                WHERE uuid_column = found_person_uuid;

						UPDATE public.affiliates 
							SET
								uuid_reference = found_person_uuid
							WHERE
								id = NEW.id;

					ELSE
	                    -- Insertar o actualizar en persons
	                    INSERT INTO beneficiaries.persons (
	                        city_birth_id,
	                        pension_entity_id,
	                        financial_entity_id,
	                        first_name,
	                        second_name,
	                        last_name,
	                        mothers_last_name,
	                        surname_husband,
	                        identity_card,
	                        due_date,
	                        is_duedate_undefined,
	                        gender,
	                        civil_status,
	                        birth_date,
	                        date_death,
	                        death_certificate_number,
	                        reason_death,
	                        phone_number,
	                        cell_phone_number,
	                        nua,
	                        account_number,
	                        sigep_status,
	                        id_person_senasir,
	                        created_at,
	                        updated_at,
	                        deleted_at,
	                        uuid_column
	                    )
	                    VALUES (
	                        NEW.city_birth_id,
	                        NEW.pension_entity_id,
	                        NEW.financial_entity_id,
	                        NEW.first_name,
	                        NEW.second_name,
	                        NEW.last_name,
	                        NEW.mothers_last_name,
	                        NEW.surname_husband,
	                        NEW.identity_card,
	                        NEW.due_date,
	                        NEW.is_duedate_undefined,
	                        NEW.gender,
	                        NEW.civil_status,
	                        NEW.birth_date,
	                        NEW.date_death,
	                        NEW.death_certificate_number,
	                        NEW.reason_death,
	                        NEW.phone_number,
	                        NEW.cell_phone_number,
	                        NEW.nua,
	                        NEW.account_number,
	                        NEW.sigep_status,
	                        NEW.id_person_senasir,
	                        NEW.created_at,
	                        NEW.updated_at,
	                        NEW.deleted_at,
	                        NEW.uuid_reference
	                    )
	                    ON CONFLICT (uuid_column) DO UPDATE
	                    SET city_birth_id          = EXCLUDED.city_birth_id,
	                        pension_entity_id      = EXCLUDED.pension_entity_id,
	                        financial_entity_id    = EXCLUDED.financial_entity_id,
	                        first_name             = EXCLUDED.first_name,
	                        second_name            = EXCLUDED.second_name,
	                        last_name              = EXCLUDED.last_name,
	                        mothers_last_name      = EXCLUDED.mothers_last_name,
	                        surname_husband        = EXCLUDED.surname_husband,
	                        identity_card          = EXCLUDED.identity_card,
	                        due_date               = EXCLUDED.due_date,
	                        is_duedate_undefined   = EXCLUDED.is_duedate_undefined,
	                        gender                 = EXCLUDED.gender,
	                        civil_status           = EXCLUDED.civil_status,
	                        birth_date             = EXCLUDED.birth_date,
	                        date_death             = EXCLUDED.date_death,
	                        death_certificate_number = EXCLUDED.death_certificate_number,
	                        reason_death           = EXCLUDED.reason_death,
	                        phone_number           = EXCLUDED.phone_number,
	                        cell_phone_number      = EXCLUDED.cell_phone_number,
	                        nua                    = EXCLUDED.nua,
	                        account_number         = EXCLUDED.account_number,
	                        sigep_status           = EXCLUDED.sigep_status,
	                        id_person_senasir      = EXCLUDED.id_person_senasir,
	                        updated_at             = EXCLUDED.updated_at,
	                        deleted_at             = EXCLUDED.deleted_at
	                    RETURNING id INTO new_person_id;
					END IF;
                    -- Insertar o actualizar en affiliates
                    INSERT INTO beneficiaries.affiliates (
                        id,
                        registration,
                        type,
                        date_entry,
                        date_derelict,
                        reason_derelict,
                        date_last_contribution,
                        date_derelict_reinstatement,
                        date_entry_reinstatement,
                        date_last_contribution_reinstatement,
                        service_years,
                        service_months,
                        unit_police_description,
                        affiliate_state_id,
                        degree_id,
                        unit_id,
                        category_id,
                        created_at,
                        updated_at,
                        deleted_at
                    )
                    VALUES (
                        NEW.id,
                        NEW.registration,
                        NEW.type,
                        NEW.date_entry,
                        NEW.date_derelict,
                        NEW.reason_derelict,
                        NEW.date_last_contribution,
                        NEW.date_derelict_reinstatement,
                        NEW.date_entry_reinstatement,
                        NEW.date_last_contribution_reinstatement,
                        NEW.service_years,
                        NEW.service_months,
                        NEW.unit_police_description,
                        NEW.affiliate_state_id,
                        NEW.degree_id,
                        NEW.unit_id,
                        NEW.category_id,
                        NEW.created_at,
                        NEW.updated_at,
                        NEW.deleted_at
                    )
                    ON CONFLICT (id) DO UPDATE
                    set
                        registration = EXCLUDED.registration,
                        type = EXCLUDED.type,
                        date_entry = EXCLUDED.date_entry,
                        date_derelict = EXCLUDED.date_derelict,
                        reason_derelict = EXCLUDED.reason_derelict,
                        date_last_contribution = EXCLUDED.date_last_contribution,
                        date_derelict_reinstatement = EXCLUDED.date_derelict_reinstatement,
                        date_entry_reinstatement = EXCLUDED.date_entry_reinstatement,
                        date_last_contribution_reinstatement = EXCLUDED.date_last_contribution_reinstatement,
                        service_years = EXCLUDED.service_years,
                        service_months = EXCLUDED.service_months,
                        unit_police_description = EXCLUDED.unit_police_description,
                        affiliate_state_id = EXCLUDED.affiliate_state_id,
                        degree_id = EXCLUDED.degree_id,
                        unit_id = EXCLUDED.unit_id,
                        category_id = EXCLUDED.category_id,
                        updated_at = EXCLUDED.updated_at,
                        deleted_at = EXCLUDED.deleted_at;

                    -- Necesario para sincronizar la secuencia en tablas donde se asigna el id manualmente
                    PERFORM setval('beneficiaries.affiliates_id_seq', (SELECT COALESCE(MAX(id)+1, 1) FROM beneficiaries.affiliates), false);

                    -- Vincular persona con afiliado en person_affiliates
                    INSERT INTO beneficiaries.person_affiliates (
                        person_id,
                        type,
                        type_id,
                        state,
                        kinship_type
                    )
                    SELECT new_person_id, 'affiliates', NEW.id, true, 1
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM beneficiaries.person_affiliates
                        WHERE person_id = new_person_id
                        AND type = 'affiliates'
                        AND type_id = NEW.id
                    );

                ELSIF TG_OP = 'DELETE' THEN
                    DELETE FROM beneficiaries.persons
                    WHERE uuid_column = OLD.uuid_reference;
                END IF;

                -- Restaurar rol
                PERFORM set_config('session_replication_role', 'origin', true);
            END IF;

            RETURN NEW;

        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error en replicate_affiliates_to_persons_and_persons_aff(): %', SQLERRM;

        END;
        $$ LANGUAGE plpgsql;

        `);
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
            CREATE OR REPLACE FUNCTION beneficiaries.replicate_persons_aff_to_public_affiliates() RETURNS TRIGGER AS $$
            begin
                RAISE NOTICE 'Ejecutando Trigger de actualización, person_aff a affiliado';
                IF current_setting('session_replication_role') = 'origin' THEN
                    PERFORM set_config('session_replication_role', 'replica', true);

                    IF TG_OP = 'UPDATE' then
                        RAISE NOTICE 'Se esta actualizando, person_aff a affiliado ';
                        UPDATE public.affiliates
                            SET 
                                registration = NEW.registration::varchar(255),
                                type = NEW.type::varchar(255),
                                date_entry = NEW.date_entry::date,
                                date_derelict = NEW.date_derelict::date,
                                date_last_contribution = NEW.date_last_contribution::date,
                                reason_derelict = NEW.reason_derelict::varchar(255),
                                date_entry_reinstatement = NEW.date_entry_reinstatement::date,
                                date_derelict_reinstatement = NEW.date_derelict_reinstatement::date,
                                date_last_contribution_reinstatement = NEW.date_last_contribution_reinstatement::date,
                                service_years = NEW.service_years::int4,
                                service_months = NEW.service_months::int4,
                                unit_police_description = NEW.unit_police_description::varchar(255),
                                affiliate_state_id = NEW.affiliate_state_id::int8,
                                created_at = NEW.created_at::timestamp,
                                updated_at = NEW.updated_at::timestamp,
                                deleted_at = NEW.deleted_at::timestamp
                            WHERE id = NEW.id;
                    END IF;

                    PERFORM set_config('session_replication_role', 'origin', true);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;    
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS persons_uuid_idx ON beneficiaries.persons;`);
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_replicate_persons_to_affiliates_and_spouse ON beneficiaries.persons;    
    `);
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_replicate_persons_aff_to_public_affiliates ON beneficiaries.persons;    
    `);
    await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_replicate_affiliates_to_persons_and_persons_aff ON beneficiaries.persons;    
    `);
  }
}
