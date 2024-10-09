import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Affiliate } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_documents' })
export class AffiliateDocument {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ManyToOne(() => Affiliate, (affiliate) => affiliate.affiliateDocuments)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column()
  procedure_document_id: number;

  @Column()
  path: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date;
}
