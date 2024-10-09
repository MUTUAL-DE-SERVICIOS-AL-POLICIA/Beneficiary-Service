import { PersonAffiliate } from 'src/persons/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AffiliateDocument } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliates' })
export class Affiliate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { nullable: true })
  affiliate_state_id: number;

  @Column('int', { nullable: true })
  degree_id: number;

  @Column('int', { nullable: true })
  unit_id: number;

  @Column('int', { nullable: true })
  category_id: number;

  @Column('text', { nullable: true })
  registration: string;

  @Column('text', { nullable: true })
  type: string;

  @Column('date', { nullable: true })
  date_entry: Date;

  @Column('date', { nullable: true })
  date_derelict: Date;

  @Column('text', { nullable: true })
  reason_derelict: Date;

  @Column('int', { nullable: true })
  service_years: number;

  @Column('int', { nullable: true })
  service_months: number;

  @Column('text', { nullable: true })
  unit_police_description: string;

  @Column('text', { nullable: true })
  official: string;

  @Column('text', { nullable: true })
  book: string;

  @Column('text', { nullable: true })
  departure: string;

  @Column('date', { nullable: true })
  marriage_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @OneToMany(() => AffiliateDocument, (affiliateDocuments) => affiliateDocuments.affiliate)
  affiliateDocuments: AffiliateDocument[];

  @OneToMany(() => PersonAffiliate, (person_affiliate) => person_affiliate.type_id)
  person_affiliate: PersonAffiliate[];
}
