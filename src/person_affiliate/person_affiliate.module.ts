import { Module } from '@nestjs/common';
import { PersonAffiliateService } from './person_affiliate.service';
import { PersonAffiliateController } from './person_affiliate.controller';

@Module({
  controllers: [PersonAffiliateController],
  providers: [PersonAffiliateService],
})
export class PersonAffiliateModule {}
