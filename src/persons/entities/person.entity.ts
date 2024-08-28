import { IsString } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Person {

    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column('text')
    first_name: string;

    @Column('text',{
        nullable: true
    })
    second_name: string;

    @Column('text')
    last_name: string;

    @Column('text',{
        nullable: true
    })
    mothers_last_name: string;

    @Column('text',{
        unique:true
    })
    identity_card: string;

    @Column('date',{
        nullable: true
    })
    due_date: Date;

    @Column('boolean',{
        nullable: true
    })
    is_duedate_undefined: boolean;

    @Column('char',{ length:1 })
    gender: string;

    @Column('char',{ length:1 })
    civil_status: string;

    @Column('date')
    birth_date: Date;

    @Column('date',{
        nullable: true
    })
    death_certificate: Date;

    @Column('text',{
        nullable: true
    })
    death_certificate_number: string;

    @Column('text',{
        nullable: true
    })
    reason_death: string;

    @Column('int')
    phone_number: number;

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

}
