import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { PersonAffiliateController } from './person_affiliate.controller';
import { PersonAffiliateService } from './person_affiliate.service';
import { PersonAffiliate } from './entities/person_affiliate.entity';

@Module({
  controllers: [PersonsController, PersonAffiliateController],
  providers: [PersonsService, PersonAffiliateService],
  imports: [TypeOrmModule.forFeature([Person, PersonAffiliate])],
})
export class PersonsModule {}
