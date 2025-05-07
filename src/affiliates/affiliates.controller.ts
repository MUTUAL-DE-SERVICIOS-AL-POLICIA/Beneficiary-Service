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
  findOne(@Payload('affiliateId', ParseIntPipe) affiliateId: number) {
    return this.affiliatesService.findOne(affiliateId);
  }

  @MessagePattern('affiliate.findOneData')
  findOneData(@Payload('affiliateId', ParseIntPipe) affiliateId: number) {
    return this.affiliatesService.findOneData(affiliateId);
  }

  @MessagePattern('affiliate.createOrUpdateDocument')
  @UsePipes(new FileRequiredPipe())
  async createOrUpdateDocument(
    @Payload() payload: { affiliateId: string; procedureDocumentId: string; documentPdf: Buffer },
  ) {
    const { affiliateId, procedureDocumentId, documentPdf } = payload;
    return this.affiliatesService.createOrUpdateDocument(
      +affiliateId,
      +procedureDocumentId,
      documentPdf,
    );
  }

  @MessagePattern('affiliate.showDocuments')
  showDocuments(@Payload('affiliateId', ParseIntPipe) affiliateId: number) {
    return this.affiliatesService.showDocuments(affiliateId);
  }

  @MessagePattern('affiliate.findDocument')
  findDocument(
    @Payload('affiliateId', ParseIntPipe) affiliateId: number,
    @Payload('procedureDocumentId', ParseIntPipe) procedureDocumentId: number,
  ) {
    return this.affiliatesService.findDocument(affiliateId, procedureDocumentId);
  }

  @MessagePattern('affiliate.collateDocuments')
  collateDocuments(
    @Payload('affiliateId', ParseIntPipe) affiliateId: number,
    @Payload('modalityId', ParseIntPipe) modalityId: number,
  ) {
    return this.affiliatesService.collateDocuments(affiliateId, modalityId);
  }

  @MessagePattern('affiliate.documentsAnalysis')
  documentsAnalysis(@Payload() payload: { path: string; user: string; pass: string }) {
    const { user, pass } = payload;
    return this.affiliatesService.documentsAnalysis(user, pass);
  }

  @MessagePattern('affiliate.documentsImports')
  documentsImports(@Payload() payload: object) {
    return this.affiliatesService.documentsImports(payload);
  }
}
