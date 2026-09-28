import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'beneficiaries', name: 'document_import_plans' })
export class DocumentImportPlan {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ length: 255 })
  ownerUsername: string;

  @Column({ type: 'jsonb' })
  plan: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
