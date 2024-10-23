import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { Affiliate } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_documents' })
export class AffiliateDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Affiliate, (affiliate) => affiliate.affiliateDocuments)
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
