import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { UpdateAffiliateDto } from './dto/update-affiliate.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Post()
  create(@Body() createAffiliateDto: CreateAffiliateDto) {
    return this.affiliatesService.create(createAffiliateDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    console.log(paginationDto);
    return this.affiliatesService.findAll(paginationDto);
  }
  @MessagePattern('affiliate.findOne')
  findOne(@Payload('id', ParseIntPipe) id: number) {
    return this.affiliatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAffiliateDto: UpdateAffiliateDto) {
    return this.affiliatesService.update(+id, updateAffiliateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.affiliatesService.remove(+id);
  }

  @MessagePattern('affiliate.showDocuments')
  showDocuments(@Payload('id', ParseIntPipe) affiliate_id: number) {
    return this.affiliatesService.showDocuments(affiliate_id);
  }
}
