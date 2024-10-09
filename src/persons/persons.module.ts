import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person, PersonAffiliate } from './entities';
import { PersonAffiliateController } from './person_affiliate.controller';
import { PersonAffiliateService } from './person_affiliate.service';

@Module({
  controllers: [PersonsController, PersonAffiliateController],
  providers: [PersonsService, PersonAffiliateService],
  imports: [TypeOrmModule.forFeature([Person, PersonAffiliate])],
})
export class PersonsModule {}
