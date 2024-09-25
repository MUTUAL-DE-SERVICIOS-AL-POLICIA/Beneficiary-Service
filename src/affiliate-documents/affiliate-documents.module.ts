import { Module } from '@nestjs/common';
import { AffiliateDocumentsService } from './affiliate-documents.service';
import { AffiliateDocumentsController } from './affiliate-documents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliateDocument } from './entities/affiliate-document.entity';

@Module({
  controllers: [AffiliateDocumentsController],
  providers: [AffiliateDocumentsService],
  imports: [TypeOrmModule.forFeature([AffiliateDocument])],
})
export class AffiliateDocumentsModule {}
