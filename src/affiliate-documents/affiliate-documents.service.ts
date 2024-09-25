import { Injectable } from '@nestjs/common';
import { CreateAffiliateDocumentDto } from './dto/create-affiliate-document.dto';
import { UpdateAffiliateDocumentDto } from './dto/update-affiliate-document.dto';

@Injectable()
export class AffiliateDocumentsService {
  create(createAffiliateDocumentDto: CreateAffiliateDocumentDto) {
    return 'This action adds a new affiliateDocument';
  }

  findAll() {
    return `This action returns all affiliateDocuments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} affiliateDocument`;
  }

  update(id: number, updateAffiliateDocumentDto: UpdateAffiliateDocumentDto) {
    return `This action updates a #${id} affiliateDocument`;
  }

  remove(id: number) {
    return `This action removes a #${id} affiliateDocument`;
  }
}
