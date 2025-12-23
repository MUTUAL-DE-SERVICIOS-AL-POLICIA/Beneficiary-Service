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

  @Column('varchar', {
    length: 255,
  })
  firstName: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  secondName: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  lastName: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  mothersLastName: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  surnameHusband: string;

  @Column('varchar', { length: 255, unique: true })
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

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  deathCertificateNumber: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  reasonDeath: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  phoneNumber: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  cellPhoneNumber: string;

  @Column('bigint', {
    nullable: true,
  })
  nua: string;

  @Column('bigint', {
    nullable: true,
  })
  accountNumber: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  sigepStatus: string;

  @Column('int', {
    nullable: true,
  })
  idPersonSenasir: number;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  email: string;

  @OneToMany(() => PersonAffiliate, (personAffiliate) => personAffiliate.person)
  personAffiliates: PersonAffiliate[];

  @OneToMany(() => PersonFingerprint, (personFingerprint) => personFingerprint.person)
  personFingerprints: PersonFingerprint[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
