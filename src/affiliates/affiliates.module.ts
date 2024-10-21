import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Affiliate, AffiliateDocument, StateType, AffiliateState } from './entities';

@Module({
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  imports: [TypeOrmModule.forFeature([Affiliate, AffiliateDocument, AffiliateState, StateType])],
})
export class AffiliatesModule {}
