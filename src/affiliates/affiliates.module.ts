import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateDocument } from './entities/affiliate-document.entity';

@Module({
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  imports: [TypeOrmModule.forFeature([Affiliate, AffiliateDocument])],
})
export class AffiliatesModule {}
