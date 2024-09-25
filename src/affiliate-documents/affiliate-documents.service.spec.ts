import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateDocumentsService } from './affiliate-documents.service';

describe('AffiliateDocumentsService', () => {
  let service: AffiliateDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AffiliateDocumentsService],
    }).compile();

    service = module.get<AffiliateDocumentsService>(AffiliateDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
