import { Person, FingerprintType } from 'src/persons/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity({ schema: 'beneficiaries', name: 'person_fingerprints' })
export class PersonFingerprint {
  @PrimaryColumn()
  id: number;

  @Column('int')
  quality: number;

  @Column('text')
  path: string;

  @ManyToOne(() => Person, (person) => person.personFingerprints)
  person: Person;

  @ManyToOne(() => FingerprintType, (fingerprintType) => fingerprintType.person_fingerprints)
  fingerprint_type: FingerprintType;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date;
}
