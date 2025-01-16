import { Person, FingerprintType } from 'src/persons/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity({ schema: 'beneficiaries', name: 'person_fingerprints' })
export class PersonFingerprint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  quality: number;

  @Column('text')
  path: string;

  @ManyToOne(() => Person, (person) => person.personFingerprints)
  person: Person;

  @ManyToOne(() => FingerprintType, (fingerprintType) => fingerprintType.personFingerprints)
  fingerprintType: FingerprintType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @Column('int')
  attempts: number;
}
