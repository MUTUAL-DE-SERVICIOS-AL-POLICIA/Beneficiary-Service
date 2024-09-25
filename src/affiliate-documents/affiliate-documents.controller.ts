import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AffiliateDocumentsService } from './affiliate-documents.service';
import { CreateAffiliateDocumentDto } from './dto/create-affiliate-document.dto';
import { UpdateAffiliateDocumentDto } from './dto/update-affiliate-document.dto';

@Controller()
export class AffiliateDocumentsController {
  constructor(private readonly affiliateDocumentsService: AffiliateDocumentsService) {}

  @MessagePattern('createAffiliateDocument')
  create(@Payload() createAffiliateDocumentDto: CreateAffiliateDocumentDto) {
    return this.affiliateDocumentsService.create(createAffiliateDocumentDto);
  }

  @MessagePattern('findAllAffiliateDocuments')
  findAll() {
    return this.affiliateDocumentsService.findAll();
  }

  @MessagePattern('findOneAffiliateDocument')
  findOne(@Payload() id: number) {
    return this.affiliateDocumentsService.findOne(id);
  }

  @MessagePattern('updateAffiliateDocument')
  update(@Payload() updateAffiliateDocumentDto: UpdateAffiliateDocumentDto) {
    return this.affiliateDocumentsService.update(
      updateAffiliateDocumentDto.id,
      updateAffiliateDocumentDto,
    );
  }

  @MessagePattern('removeAffiliateDocument')
  remove(@Payload() id: number) {
    return this.affiliateDocumentsService.remove(id);
  }
}
