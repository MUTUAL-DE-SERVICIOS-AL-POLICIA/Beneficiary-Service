import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateDocumentsController } from './affiliate-documents.controller';
import { AffiliateDocumentsService } from './affiliate-documents.service';

describe('AffiliateDocumentsController', () => {
  let controller: AffiliateDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateDocumentsController],
      providers: [AffiliateDocumentsService],
    }).compile();

    controller = module.get<AffiliateDocumentsController>(AffiliateDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
