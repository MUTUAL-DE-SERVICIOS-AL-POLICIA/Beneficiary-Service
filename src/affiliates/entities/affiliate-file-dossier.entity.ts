import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { Affiliate } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_file_dossiers' })
export class AffiliateFileDossier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  affiliateId: number;
  @ManyToOne(() => Affiliate, (affiliate) => affiliate.affiliateFileDossiers)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column()
  fileDossierId: number;

  @Column()
  path: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
