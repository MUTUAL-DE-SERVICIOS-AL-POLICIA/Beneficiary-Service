import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AffiliateState } from './';

@Entity({ schema: 'beneficiaries', name: 'state_types' })
export class StateType {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => AffiliateState, (affiliateStates) => affiliateStates.stateType)
  affiliateStates: AffiliateState[];
}
