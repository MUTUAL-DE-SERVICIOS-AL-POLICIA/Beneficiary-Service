import { IsString } from "class-validator";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Generated, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ schema: 'beneficiaries', name: 'persons' })
export class Person {

    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column('uuid')
    @Generated('uuid')
    uuid_column: string;

    @Column('int',{
        nullable:true
    })
    city_birth_id: number;

    @Column('int',{
        nullable:true
    })
    pension_entity_id:number;

    @Column('int',{
        nullable:true
    })
    financial_entity_id:number

    @Column('text')
    first_name: string;

    @Column('text',{
        nullable: true
    })
    second_name: string;

    @Column('text',{
        nullable:true
    })
    last_name: string;

    @Column('text',{
        nullable: true
    })
    mothers_last_name: string;

    @Column('text',{
        nullable: true
    })
    surname_husband:string;

    @Column('text')
    identity_card: string;

    @Column('date',{
        nullable: true
    })
    due_date: Date;

    @Column('boolean',{ default: false })
    is_duedate_undefined: boolean;

    @Column('char',{ length:1 })
    gender: string;

    @Column('char',{ length:1, nullable:true })
    civil_status: string;

    @Column('date',{
        nullable:true
    })
    birth_date: Date;

    @Column('date',{
        nullable: true
    })
    date_death: Date

    @Column('text',{
        nullable: true
    })
    death_certificate_number: string;

    @Column('text',{
        nullable: true
    })
    reason_death: string;

    @Column('text',{
        nullable:true
    }) // Ahora es 'varchar'
    phone_number: string;

    @Column('text',{
        nullable:true
    })
    cell_phone_number: string;

    @Column('int',{
        nullable: true
    })
    nua: number;

    @Column('text',{
        nullable: true
    })
    account_number: string;

    @Column('text',{
        nullable: true
    })
    sigep_status: string;

    @Column('int',{
        nullable: true
    })
    id_person_senasir: number;

    @Column('date',{
        nullable: true
    })
    date_last_contribution: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', nullable: true })
    deletedAt: Date;

}
