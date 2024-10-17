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
  UsePipes,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto, UpdateAffiliateDto } from './dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileRequiredPipe } from './pipes/file-required.pipe';
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

  @MessagePattern('affiliate.createDocuments')
  @UsePipes(new FileRequiredPipe())
  async createDocuments(
    @Payload() payload: { affiliateId: string; procedureDocumentId: string; document_pdf: Buffer },
  ) {
    const { affiliateId, procedureDocumentId, document_pdf } = payload;
    return this.affiliatesService.createDocuments(+affiliateId, +procedureDocumentId, document_pdf);
  }

  @MessagePattern('affiliate.showDocuments')
  showDocuments(@Payload('id', ParseIntPipe) affiliate_id: number) {
    return this.affiliatesService.showDocuments(affiliate_id);
  }

  @MessagePattern('affiliate.findDocument')
  findDocument(
    @Payload('affiliate_id', ParseIntPipe) affiliate_id: number,
    @Payload('procedure_document_id', ParseIntPipe) procedure_document_id: number,
  ) {
    return this.affiliatesService.findDocument(affiliate_id, procedure_document_id);
  }
}
