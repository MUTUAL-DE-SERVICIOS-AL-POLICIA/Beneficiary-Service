import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonAffiliateDto } from './create-person_affiliate.dto';

export class UpdatePersonAffiliateDto extends PartialType(CreatePersonAffiliateDto) {}
