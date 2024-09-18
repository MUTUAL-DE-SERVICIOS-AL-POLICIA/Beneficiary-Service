import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PersonAffiliateService } from './person_affiliate.service';
import { CreatePersonAffiliateDto } from './dto/create-person_affiliate.dto';
import { UpdatePersonAffiliateDto } from './dto/update-person_affiliate.dto';

@Controller('person-affiliate')
export class PersonAffiliateController {
  constructor(private readonly personAffiliateService: PersonAffiliateService) {}

  @Post()
  create(@Body() createPersonAffiliateDto: CreatePersonAffiliateDto) {
    return this.personAffiliateService.create(createPersonAffiliateDto);
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
  update(@Param('id') id: string, @Body() updatePersonAffiliateDto: UpdatePersonAffiliateDto) {
    return this.personAffiliateService.update(+id, updatePersonAffiliateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.personAffiliateService.remove(+id);
  }
}
