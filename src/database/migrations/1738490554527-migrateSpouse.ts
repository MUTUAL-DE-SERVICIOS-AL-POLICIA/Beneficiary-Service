import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateSpouse1738490554527 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Ejecutando BeneficiaryMigrateSpouse');
    await queryRunner.query(`CREATE OR REPLACE PROCEDURE migrate_spouse()
    LANGUAGE plpgsql
    AS $procedure$
    DECLARE
        campo RECORD;
        afiliado RECORD;
        persona_afiliado RECORD;
        persona_esposa RECORD;
        affiliate_and_spouse RECORD;
        total_count INT := 0;
        total_count_found INT := 0;
        total_count_not_found INT := 0;
        total_affiliate_and_spouse INT := 0;
        duplicate_record INT := 0;
        updated_count INTEGER;
    BEGIN 
        FOR campo IN ( SELECT * FROM spouses order by id )
        LOOP
            BEGIN
            total_count := total_count + 1;
            
            SELECT * INTO afiliado                    -- Obtenemos al afiliado
            FROM affiliates a
            WHERE a.id = campo.affiliate_id;
            
            SELECT * INTO persona_afiliado            -- Buscamos al afiliado en persona
            FROM beneficiaries.persons p
            WHERE p.uuid_column = afiliado.uuid_reference;
                    
            SELECT * INTO persona_esposa              -- Buscamos al conyuge en persona
            FROM beneficiaries.persons p 
            WHERE p.identity_card = campo.identity_card;

            IF FOUND THEN                             -- existe el conyuge en persona?
                total_count_found := total_count_found + 1;
                SELECT * INTO affiliate_and_spouse    -- es conyuge y ademas es afiliado?
                FROM spouses s 
                WHERE s.identity_card NOT IN (        -- no tienen doble registro
                    SELECT s2.identity_card 
                    FROM spouses s2
                    WHERE s2.identity_card IN (       -- todas las esposas que son policias,
                        SELECT a2.identity_card 
                        FROM affiliates a2 
                    )
                    GROUP BY s2.identity_card 
                    HAVING count(s2.identity_card) > 1
                )
                AND s.identity_card = campo.identity_card;
            
                IF FOUND THEN                         -- es conyuge y afiliado?
                    UPDATE spouses 
                    SET uuid_column = persona_esposa.uuid_column
                    WHERE identity_card = campo.identity_card;

                    total_affiliate_and_spouse := total_affiliate_and_spouse + 1;
                    INSERT INTO beneficiaries.person_affiliates (
                        person_id,
                        type,
                        type_id,
                        kinship_type,
                        state
                    ) VALUES (
                        persona_esposa.id,
                        'persons',
                        persona_afiliado.id,
                        10,
                        true
                    );
                ELSE
                    duplicate_record := duplicate_record + 1;
                    RAISE NOTICE 'Carnet doblemente registrado: %', campo.identity_card;
                END IF;
            ELSE
                -- Si no existe, lo creamos en persona
                total_count_not_found := total_count_not_found + 1;
                INSERT INTO beneficiaries.persons (
                    city_birth_id,
                    pension_entity_id, financial_entity_id,
                    first_name, second_name, last_name,
                    mothers_last_name, surname_husband,
                    identity_card, due_date, is_duedate_undefined,
                    gender, civil_status, birth_date,
                    date_death, death_certificate_number,
                    reason_death, phone_number, cell_phone_number,
                    nua, account_number, sigep_status,
                    id_person_senasir, date_last_contribution,
                    created_at, updated_at, deleted_at, 
                    uuid_column
                )
                SELECT campo.city_birth_id, NULL, NULL, campo.first_name, campo.second_name, campo.last_name,
                campo.mothers_last_name, campo.surname_husband, campo.identity_card, campo.due_date, campo.is_duedate_undefined,
                NULL, campo.civil_status, campo.birth_date, campo.date_death, campo.death_certificate_number,
                campo.reason_death, NULL, NULL, NULL, NULL, NULL,
                NULL, NULL, campo.created_at, campo.updated_at, campo.deleted_at, 
                uuid_generate_v4()
                FROM spouses
                WHERE affiliate_id = campo.affiliate_id
                LIMIT 1
                RETURNING id, identity_card, uuid_column  INTO persona_esposa;
    
                -- Realizar la relación
                INSERT INTO beneficiaries.person_affiliates (
                    person_id,
                    type,
                    type_id,
                    kinship_type,
                    state
                ) VALUES (
                    persona_esposa.id,
                    'persons',
                    persona_afiliado.id,
                    10,
                    true
                );

                UPDATE spouses
                SET uuid_column = persona_esposa.uuid_column
                WHERE identity_card = persona_esposa.identity_card;

            END IF;

            UPDATE beneficiaries.affiliates
            SET official = campo.official,
                book = campo.book,
                departure = campo.departure,
                marriage_date = campo.marriage_date
            WHERE id = campo.affiliate_id
            AND COALESCE(campo.official, campo.book, campo.departure, campo.marriage_date::text) IS NOT NULL;

            -- Obtener el número de registros actualizados
            GET DIAGNOSTICS updated_count = ROW_COUNT;

            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error en affiliate_id: %', campo.affiliate_id;
                    RAISE;
            END;
    END LOOP;
    RAISE NOTICE 'Total de registros procesados: %', total_count;
    RAISE NOTICE 'Total de registros encontrados: %', total_count_found;
    RAISE NOTICE 'Total de registros no encontrados: %', total_count_not_found;
    RAISE NOTICE 'Total de afiliados que son conyuges encontrados: %', total_affiliate_and_spouse;
    RAISE NOTICE 'Total de registros duplicados encontrados: %', duplicate_record;
    RAISE NOTICE 'Total de registros en la tabla affiliates del esquema beneficiaries actualizados: %', updated_count;
    END;
    $procedure$;

    CALL migrate_spouse();`);
  }

  public async down(): Promise<void> {}
}
