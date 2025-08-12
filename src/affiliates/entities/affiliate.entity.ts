import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AffiliateDocument, AffiliateState, AffiliateFileDossier } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliates' })
export class Affiliate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { nullable: true })
  degreeId: number;

  @Column('int', { nullable: true })
  unitId: number;

  @Column('int', { nullable: true })
  categoryId: number;

  @Column('text', { nullable: true })
  registration: string;

  @Column('text', { nullable: true })
  type: string;

  @Column('date', { nullable: true })
  dateEntry: Date;

  @Column('date', { nullable: true })
  dateDerelict: Date;

  @Column('text', { nullable: true })
  reasonDerelict: Date;

  @Column('int', { nullable: true })
  serviceYears: number;

  @Column('int', { nullable: true })
  serviceMonths: number;

  @Column('text', { nullable: true })
  unitPoliceDescription: string;

  @Column('text', { nullable: true })
  official: string;

  @Column('text', { nullable: true })
  book: string;

  @Column('text', { nullable: true })
  departure: string;

  @Column('date', { nullable: true })
  marriageDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => AffiliateDocument, (affiliateDocuments) => affiliateDocuments.affiliate)
  affiliateDocuments: AffiliateDocument[];

  @OneToMany(() => AffiliateFileDossier, (affiliateFileDossiers) => affiliateFileDossiers.affiliate)
  affiliateFileDossiers: AffiliateFileDossier[];

  @ManyToOne(() => AffiliateState, (affiliateState) => affiliateState.affiliates)
  @JoinColumn({ name: 'affiliate_state_id' })
  affiliateState: AffiliateState;
}
