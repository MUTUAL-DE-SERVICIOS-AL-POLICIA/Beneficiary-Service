/// <reference types="jest" />
jest.mock(
  'src/config/envs',
  () => ({
    envsFtp: {
      ftpImportDocumentsPvtbe: '/imports',
      ftpDocuments: '/documents',
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/common',
  () => ({ PaginationDto: class PaginationDto {}, NatsService: class NatsService {} }),
  { virtual: true },
);

import { RpcException } from '@nestjs/microservices';
import { AffiliateDocument, DocumentImportPlan } from './entities';
import { AffiliatesService } from './affiliates.service';

const actor = { username: 'operator', name: "Operator O'Neil" };
const importId = '7efc93cf-46a8-4b3d-94dc-f6abf406ff1d';
const file = {
  affiliate_id: '10',
  procedure_document_id: 20,
  shortened: "CERT'O.pdf",
  oldPath: "/imports/10/CERT'O.pdf",
  newPath: "/documents/10/CERT'O.pdf",
  personId: 30,
};
const plan = {
  totalFolder: 1,
  readFolder: 1,
  nonNumericIds: [],
  validFolder: 1,
  dataErrorReadFolder: [],
  filesValidFolder: 1,
  filesValid: 1,
  dataErrorReadFiles: {},
  dataValidRealExist: [],
  dataValidRealNotExist: [file],
  duplicateData: {},
};

describe('PVTBE document import plans', () => {
  const planRepository = {
    delete: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const planTransactionRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const affiliateDocumentTransactionRepository = {
    insert: jest.fn(),
    update: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === DocumentImportPlan) return planTransactionRepository;
      if (entity === AffiliateDocument) return affiliateDocumentTransactionRepository;
      throw new Error('Unexpected repository');
    }),
    query: jest.fn(),
  };
  const nats = { firstValue: jest.fn() };
  const dataSource = {
    query: jest.fn(),
    transaction: jest.fn((callback) => callback(manager)),
  };
  const service = new AffiliatesService(
    {} as never,
    {} as never,
    {} as never,
    planRepository as never,
    nats as never,
    dataSource as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    nats.firstValue.mockResolvedValue({ serviceStatus: true });
  });

  it('analyzes without auth.login and stores a server-side plan owned by the actor', async () => {
    nats.firstValue.mockImplementation(async (pattern: string, payload: { path?: string }) => {
      if (pattern === 'ftp.connectSwitch') return { serviceStatus: true };
      if (pattern === 'ftp.listFiles' && payload.path === '/imports') {
        return { serviceStatus: true, data: [{ name: '10' }] };
      }
      if (pattern === 'ftp.listFiles' && payload.path === '/imports/10') {
        return { serviceStatus: true, data: [{ name: "CERT'O.pdf" }] };
      }
      throw new Error(`Unexpected pattern ${pattern}`);
    });
    dataSource.query.mockImplementation(async (sql: string, parameters: unknown[]) => {
      if (sql.includes('FROM beneficiaries.affiliates')) return [{ id: 10 }];
      if (sql.includes('FROM public.procedure_documents')) {
        expect(parameters).toEqual([["CERT'O"]]);
        return [{ id: 20, shortened: "CERT'O" }];
      }
      if (sql.includes('FROM beneficiaries.person_affiliates')) return [{ person_id: 30 }];
      if (sql.includes('FROM beneficiaries.affiliate_documents')) return [];
      throw new Error(`Unexpected query ${sql}`);
    });

    const response = await service.documentsAnalysis(actor);

    expect(nats.firstValue).not.toHaveBeenCalledWith('auth.login', expect.anything());
    expect(response).toMatchObject({
      totalFolder: 1,
      dataValidRealNotExist: [file],
      importId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      expiresAt: expect.any(String),
    });
    expect(response).not.toHaveProperty('user');
    expect(planRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUsername: actor.username, plan, consumedAt: null }),
    );
  });

  it('imports only the stored plan and writes a parameterized audit with the trusted actor', async () => {
    planTransactionRepository.findOne.mockResolvedValue({
      id: importId,
      ownerUsername: actor.username,
      plan,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    const response = await service.documentsImports(importId, actor);

    expect(nats.firstValue).toHaveBeenCalledWith('ftp.renameFile', {
      oldPath: file.oldPath,
      newPath: file.newPath,
    });
    expect(affiliateDocumentTransactionRepository.insert).toHaveBeenCalledWith({
      affiliateId: 10,
      procedureDocumentId: 20,
      path: file.newPath,
    });
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('VALUES ($1::jsonb, $2, $3, $4::jsonb, $5::jsonb, $6)'),
      expect.arrayContaining([JSON.stringify(actor), file.personId]),
    );
    expect(planTransactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ consumedAt: expect.any(Date) }),
    );
    expect(response).toMatchObject({ newFiles: 1, updateFIles: 0, totalFiles: 1 });
  });

  it.each([
    [
      'another owner',
      { ownerUsername: 'another', consumedAt: null, expiresAt: new Date(Date.now() + 60_000) },
    ],
    [
      'expired',
      { ownerUsername: actor.username, consumedAt: null, expiresAt: new Date(Date.now() - 1) },
    ],
    [
      'already consumed',
      {
        ownerUsername: actor.username,
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    ],
  ])('rejects a plan belonging to %s without moving files', async (_label, state) => {
    planTransactionRepository.findOne.mockResolvedValue({ id: importId, plan, ...state });

    await expect(service.documentsImports(importId, actor)).rejects.toBeInstanceOf(RpcException);

    expect(nats.firstValue).not.toHaveBeenCalledWith('ftp.renameFile', expect.anything());
    expect(planTransactionRepository.save).not.toHaveBeenCalled();
  });
});
