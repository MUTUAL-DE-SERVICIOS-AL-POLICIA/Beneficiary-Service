import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { stateType } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_states' })
export class AffiliateState {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => stateType, (state_type) => state_type.affiliate_states)
  state_type: stateType;
}
