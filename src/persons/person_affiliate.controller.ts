import { Controller, Get, Post, Patch, Param, Delete } from '@nestjs/common';
import { PersonAffiliateService } from './person_affiliate.service';

@Controller('person-affiliate')
export class PersonAffiliateController {
  constructor(private readonly personAffiliateService: PersonAffiliateService) {}

  @Post()
  create() {
    return this.personAffiliateService.create();
  }

  @Get()
  findAll() {
    return this.personAffiliateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personAffiliateService.findOne(+id);
  }

  @Patch(':id')
  update() {
    // return this.personAffiliateService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.personAffiliateService.remove(+id);
  }
}
