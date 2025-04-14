import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateOrphan1738490554528 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Ejecutando BeneficiaryMigrateOrphan');
    await queryRunner.query(`
      with only_orphans as (
        select a.identity_card affiliate_ci, s.identity_card spouse_ci, eca.* 
        from public.eco_com_applicants eca 
        left join affiliates a on a.identity_card = eca.identity_card 
        left join spouses s on s.identity_card = eca.identity_card 
        join economic_complements ec on ec.id = eca.economic_complement_id 
        where ec.eco_com_procedure_id in (25) 
        -- and ec.eco_com_modality_id in (1,4,6,8) -- Casos Vejez
        -- and ec.eco_com_modality_id in (2,5,7,9) -- Casos Viudedad
        and ec.eco_com_modality_id in (3,10,11,12) -- Casos Orfandad
        and a.identity_card is null
        and s.identity_card is null)
      insert into beneficiaries.persons (
        birth_date, cell_phone_number , city_birth_id ,
        civil_status , created_at ,
        death_certificate_number , deleted_at ,
        due_date , first_name , gender , identity_card ,
        is_duedate_undefined , last_name , mothers_last_name , 
        nua , phone_number , reason_death ,
        second_name , surname_husband , uuid_column, updated_at 
      )
      select birth_date, cell_phone_number , city_birth_id ,
        civil_status , created_at ,
        death_certificate_number , deleted_at ,
        due_date , first_name , gender , identity_card ,
        is_duedate_undefined , last_name , mothers_last_name , 
        nua , phone_number , reason_death ,
        second_name , surname_husband , uuid_generate_v4()_, updated_at from only_orphans;`);

    await queryRunner.query(`
      with only_orphans as (
        select a.identity_card affiliate_ci, s.identity_card spouse_ci, eca.identity_card 
        from public.eco_com_applicants eca 
        left join affiliates a on a.identity_card = eca.identity_card 
        left join spouses s on s.identity_card = eca.identity_card 
        join economic_complements ec on ec.id = eca.economic_complement_id 
        where ec.eco_com_procedure_id in (25) 
        -- and ec.eco_com_modality_id in (1,4,6,8) -- Casos Vejez
        -- and ec.eco_com_modality_id in (2,5,7,9) -- Casos Viudedad
        and ec.eco_com_modality_id in (3,10,11,12) -- Casos Orfandad
        and a.identity_card is null
        and s.identity_card is null
      )
      insert into beneficiaries.person_affiliates (
          person_id, type, type_id, state, kinship_type
      )
      select p.id person_id, 'persons' as type, p2.id as type_id, true as state, 3 as kinships_type
      from beneficiaries.persons p
      join public.eco_com_applicants eca on eca.identity_card = p.identity_card 
      join public.economic_complements ec on ec.id = eca.economic_complement_id 
      join public.affiliates a on ec.affiliate_id = a.id
      join beneficiaries.persons p2 on a.uuid_reference = p2.uuid_column 
      where p.identity_card in (select identity_card from only_orphans)
      and ec.eco_com_procedure_id = 25;`);
  }

  public async down(): Promise<void> {}
}
