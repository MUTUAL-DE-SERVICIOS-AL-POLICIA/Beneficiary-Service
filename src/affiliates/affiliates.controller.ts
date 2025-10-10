import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { PaginationDto } from 'src/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
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
  async createOrUpdateDocument(
    @Payload() payload: { affiliateId: string; procedureDocumentId: string },
  ) {
    const { affiliateId, procedureDocumentId } = payload;
    return this.affiliatesService.createOrUpdateDocument(+affiliateId, +procedureDocumentId);
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

  @MessagePattern('affiliate.findAllFileDossiers')
  findAllFileDossiers() {
    return this.affiliatesService.findAllFileDossiers();
  }

  @MessagePattern('affiliate.findAllDocuments')
  findAllDocuments() {
    return this.affiliatesService.findAllDocuments();
  }

  @MessagePattern('affiliate.showFileDossiers')
  showFileDossiers(@Payload('affiliateId', ParseIntPipe) affiliateId: number) {
    return this.affiliatesService.showFileDossiers(affiliateId);
  }

  @MessagePattern('affiliate.findFileDossier')
  findFileDossier(
    @Payload('affiliateId', ParseIntPipe) affiliateId: number,
    @Payload('fileDossierId', ParseIntPipe) fileDossierId: number,
  ) {
    return this.affiliatesService.findFileDossier(affiliateId, fileDossierId);
  }

  @MessagePattern('affiliate.createOrUpdateFileDossier')
  async createOrUpdateFileDossier(
    @Payload() payload: { affiliateId: string; fileDossierId: string },
  ) {
    const { affiliateId, fileDossierId } = payload;
    return this.affiliatesService.createOrUpdateFileDossier(+affiliateId, +fileDossierId);
  }

  @MessagePattern('affiliate.deleteFileDossier')
  deleteFileDossier(
    @Payload('affiliateId', ParseIntPipe) affiliateId: number,
    @Payload('fileDossierId', ParseIntPipe) fileDossierId: number,
  ) {
    return this.affiliatesService.deleteFileDossier(affiliateId, fileDossierId);
  }
}
