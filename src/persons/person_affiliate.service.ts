import { Injectable } from '@nestjs/common';

@Injectable()
export class PersonAffiliateService {
  create() {
    return 'This action adds a new personAffiliate';
  }

  findAll() {
    return `This action returns all personAffiliate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} personAffiliate`;
  }

  update(id: number) {
    return `This action updates a #${id} personAffiliate`;
  }

  remove(id: number) {
    return `This action removes a #${id} personAffiliate`;
  }
}
