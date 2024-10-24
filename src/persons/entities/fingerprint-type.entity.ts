import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PersonFingerprint } from './person-fingerprint.entity';

@Entity({ schema: 'beneficiaries', name: 'fingerprint_types' })
export class FingerprintType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('text')
  name: string;

  @Column('text')
  short_name: string;

  @OneToMany(() => PersonFingerprint, (personFingerprint) => personFingerprint.fingerprintType)
  personFingerprints: PersonFingerprint[];
}
