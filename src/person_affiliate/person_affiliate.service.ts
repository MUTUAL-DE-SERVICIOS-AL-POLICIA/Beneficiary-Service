import { Injectable } from '@nestjs/common';
import { CreatePersonAffiliateDto } from './dto/create-person_affiliate.dto';
import { UpdatePersonAffiliateDto } from './dto/update-person_affiliate.dto';

@Injectable()
export class PersonAffiliateService {
  create(createPersonAffiliateDto: CreatePersonAffiliateDto) {
    return 'This action adds a new personAffiliate';
  }

  findAll() {
    return `This action returns all personAffiliate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} personAffiliate`;
  }

  update(id: number, updatePersonAffiliateDto: UpdatePersonAffiliateDto) {
    return `This action updates a #${id} personAffiliate`;
  }

  remove(id: number) {
    return `This action removes a #${id} personAffiliate`;
  }
}
