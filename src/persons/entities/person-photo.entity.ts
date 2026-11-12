import { Person } from 'src/persons/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'beneficiaries', name: 'person_photos' })
export class PersonPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  path: string;

  @Column()
  personId: number;
  @OneToOne(() => Person, (person) => person.personPhoto)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}