import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PersonFingerprint } from './person-fingerprint.entity';

@Entity({ schema: 'beneficiaries', name: 'fingerprint_types' })
export class FingerprintType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('text')
  name: string;

  @OneToMany(() => PersonFingerprint, (personFingerprint) => personFingerprint.fingerprint_type)
  person_fingerprints: PersonFingerprint[];
}
