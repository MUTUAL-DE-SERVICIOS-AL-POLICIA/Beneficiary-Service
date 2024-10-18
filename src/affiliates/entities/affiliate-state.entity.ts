import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Affiliate, StateType } from './';

@Entity({ schema: 'beneficiaries', name: 'affiliate_states' })
export class AffiliateState {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => StateType, (state_type) => state_type.affiliateStates)
  @JoinColumn({ name: 'state_type_id' })
  stateType: StateType;

  @OneToMany(() => Affiliate, (affiliates) => affiliates.affiliateState)
  affiliates: Affiliate[];
}
