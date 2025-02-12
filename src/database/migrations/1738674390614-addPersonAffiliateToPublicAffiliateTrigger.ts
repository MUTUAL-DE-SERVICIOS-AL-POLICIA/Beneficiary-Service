import { MigrationInterface, QueryRunner } from 'typeorm';

export class BeneficiaryAddPersonAffiliateToPublicAffiliateTrigger1738674390614
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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
                                reason_derelict = NEW.reason_derelict::varchar(255),
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
    await queryRunner.query(`
        CREATE TRIGGER trg_replicate_persons_aff_to_public_affiliates
        AFTER INSERT OR UPDATE OR DELETE ON beneficiaries.affiliates
        FOR EACH ROW EXECUTE FUNCTION beneficiaries.replicate_persons_aff_to_public_affiliates();    
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TRIGGER trg_replicate_persons_aff_to_public_affiliates ON beneficiaries.affiliates;    
    `);
  }
}
