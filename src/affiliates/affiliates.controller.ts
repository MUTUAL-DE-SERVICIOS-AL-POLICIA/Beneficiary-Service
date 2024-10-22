import { Controller, Get, Query, ParseIntPipe, UsePipes } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { PaginationDto, FileRequiredPipe } from 'src/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    console.log(paginationDto);
    return this.affiliatesService.findAll(paginationDto);
  }
  @MessagePattern('affiliate.findOne')
  findOne(@Payload('id', ParseIntPipe) id: number) {
    return this.affiliatesService.findOne(id);
  }

  @MessagePattern('affiliate.findOneData')
  findOneData(@Payload('id', ParseIntPipe) id: number) {
    return this.affiliatesService.findOneData(id);
  }

  @MessagePattern('affiliate.createOrUpdateDocument')
  @UsePipes(new FileRequiredPipe())
  async createOrUpdateDocument(
    @Payload() payload: { affiliateId: string; procedureDocumentId: string; document_pdf: Buffer },
  ) {
    const { affiliateId, procedureDocumentId, document_pdf } = payload;
    return this.affiliatesService.createOrUpdateDocument(
      +affiliateId,
      +procedureDocumentId,
      document_pdf,
    );
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
