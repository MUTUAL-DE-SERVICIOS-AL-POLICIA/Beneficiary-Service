import { PartialType } from '@nestjs/mapped-types';
import { CreateAffiliateDocumentDto } from './create-affiliate-document.dto';

export class UpdateAffiliateDocumentDto extends PartialType(CreateAffiliateDocumentDto) {
  id: number;
}
