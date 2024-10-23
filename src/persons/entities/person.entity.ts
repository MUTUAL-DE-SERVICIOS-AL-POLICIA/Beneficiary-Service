import { PersonAffiliate, PersonFingerprint } from './';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'beneficiaries', name: 'persons' })
export class Person {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uuid')
  @Generated('uuid')
  uuidColumn: string;

  @Column('int', {
    nullable: true,
  })
  cityBirthId: number;

  @Column('int', {
    nullable: true,
  })
  pensionEntityId: number;

  @Column('int', {
    nullable: true,
  })
  financialEntityId: number;

  @Column('text')
  firstName: string;

  @Column('text', {
    nullable: true,
  })
  secondName: string;

  @Column('text', {
    nullable: true,
  })
  lastName: string;

  @Column('text', {
    nullable: true,
  })
  mothersLastName: string;

  @Column('text', {
    nullable: true,
  })
  surnameHusband: string;

  @Column('text')
  identityCard: string;

  @Column('date', {
    nullable: true,
  })
  dueDate: Date;

  @Column('boolean', { default: false })
  isDuedateUndefined: boolean;

  @Column('char', { length: 1, nullable: true })
  gender: string;

  @Column('char', { length: 1, nullable: true })
  civilStatus: string;

  @Column('date', {
    nullable: true,
  })
  birthDate: Date;

  @Column('date', {
    nullable: true,
  })
  dateDeath: Date;

  @Column('text', {
    nullable: true,
  })
  deathCertificateNumber: string;

  @Column('text', {
    nullable: true,
  })
  reasonDeath: string;

  @Column('text', {
    nullable: true,
  })
  phoneNumber: string;

  @Column('text', {
    nullable: true,
  })
  cellPhoneNumber: string;

  @Column('int', {
    nullable: true,
  })
  nua: number;

  @Column('text', {
    nullable: true,
  })
  accountNumber: string;

  @Column('text', {
    nullable: true,
  })
  sigepStatus: string;

  @Column('int', {
    nullable: true,
  })
  idPersonSenasir: number;

  @OneToMany(() => PersonAffiliate, (personAffiliate) => personAffiliate.person)
  personAffiliates: PersonAffiliate[];

  @OneToMany(() => PersonFingerprint, (personFingerprint) => personFingerprint.person)
  personFingerprints: PersonFingerprint[];

  @Column('date', {
    nullable: true,
  })
  dateLastContribution: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
