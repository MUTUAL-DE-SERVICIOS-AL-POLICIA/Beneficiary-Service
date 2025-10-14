import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Affiliate } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_documents' })
@Unique(['affiliateId', 'procedureDocumentId'])
export class AffiliateDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  affiliateId: number;
  @ManyToOne(() => Affiliate, (affiliate) => affiliate.affiliateDocuments)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column()
  procedureDocumentId: number;

  @Column()
  path: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
