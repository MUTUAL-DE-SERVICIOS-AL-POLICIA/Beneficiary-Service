import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AffiliateState } from './';

@Entity({ schema: 'beneficiaries', name: 'state_types' })
export class stateType {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => AffiliateState, (affiliateState) => affiliateState.state_type)
  affiliate_states: AffiliateState[];
}
