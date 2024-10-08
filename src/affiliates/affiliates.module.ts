import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Affiliate, AffiliateDocument, stateType, AffiliateState } from './entities';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  imports: [
    TypeOrmModule.forFeature([Affiliate, AffiliateDocument, AffiliateState, stateType]),
    NatsModule,
  ],
})
export class AffiliatesModule {}
