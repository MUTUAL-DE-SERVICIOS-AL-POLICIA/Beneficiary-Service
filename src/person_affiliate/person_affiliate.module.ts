import { Module } from '@nestjs/common';
import { PersonAffiliateService } from './person_affiliate.service';
import { PersonAffiliateController } from './person_affiliate.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonAffiliate } from './entities/person_affiliate.entity';

@Module({
  controllers: [PersonAffiliateController],
  providers: [PersonAffiliateService],
  imports: [TypeOrmModule.forFeature([PersonAffiliate])],
})
export class PersonAffiliateModule {}
