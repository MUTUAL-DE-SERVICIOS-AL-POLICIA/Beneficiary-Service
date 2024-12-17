import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto, FtpService, NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Affiliate, AffiliateDocument } from './entities';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger('AffiliateDocumentsService');

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
    @InjectRepository(AffiliateDocument)
    private readonly affiliateDocumentsRepository: Repository<AffiliateDocument>,
    private readonly ftp: FtpService,
    private readonly nats: NatsService,
  ) {}

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, page = 1 } = paginationDto;
    const offset = (page - 1) * limit;
    return this.affiliateRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: number) {
    const affiliate = await this.affiliateRepository.findOneBy({ id });

    if (!affiliate) throw new RpcException({ message: `Affiliate with: ${id} not found`, code: 404 });
    return affiliate;
  }

  async findOneData(id: number): Promise<any> {
    const affiliate = await this.findAndVerifyAffiliateWithRelations(id, [
      'affiliateState',
      'affiliateState.stateType',
    ]);

    const { createdAt, updatedAt, deletedAt, degreeId, unitId, categoryId, ...dataAffiliate } =
      affiliate;

    const [degree, unit, category] = await Promise.all([
      this.nats.fetchAndClean(degreeId, 'degrees.findOne', [
        'code',
        'shortened',
        'correlative',
        'isActive',
        'hierarchy',
      ]),
      this.nats.fetchAndClean(unitId, 'units.findOne', [
        'createdAt',
        'updatedAt',
        'deletedAt',
        'breakdown',
        'code',
        'shortened',
      ]),
      this.nats.fetchAndClean(categoryId, 'categories.findOne', ['from', 'to']),
    ]);

    return {
      ...dataAffiliate,
      degree,
      unit,
      category,
    };
  }

  async createOrUpdateDocument(
    affiliateId: number,
    procedureDocumentId: number,
    documentPdf: Buffer,
  ): Promise<{ status: boolean; message: string }> {
    const [document, affiliate] = await Promise.all([
      this.nats.firstValue('procedureDocuments.findOne', { id: procedureDocumentId }),
      this.findAndVerifyAffiliateWithRelationOneCondition(
        affiliateId,
        'affiliateDocuments',
        'procedureDocumentId',
        procedureDocumentId,
      ),
      this.ftp.connectToFtp(),
    ]);

    const initialPath = `Affiliate/Documents/${affiliateId}/`;

    if (document.status === false)
      throw new RpcException({message: 'Servicio de documentos no disponible', code: 400});

    let affiliateDocument: AffiliateDocument;
    let response: string;

    if (affiliate.affiliateDocuments.length === 0) {
      affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedureDocumentId = procedureDocumentId;
      response = 'Creado';
    } else {
      affiliateDocument = affiliate.affiliateDocuments[0];
      affiliateDocument.updatedAt = new Date();
      response = 'Actualizado';
    }

    affiliateDocument.path = `${initialPath}${document.shortened ?? document.name}.pdf`;

    await Promise.all([
      this.affiliateDocumentsRepository.save(affiliateDocument),
      this.ftp.uploadFile(documentPdf, initialPath, affiliateDocument.path),
    ]);

    this.ftp.onDestroy();

    return {
      status: document.status,
      message: `${document.name} ${response} exitosamente`,
    };
  }

  async showDocuments(affiliateId: number): Promise<any> {
    const { affiliateDocuments } = await this.findAndVerifyAffiliateWithRelations(affiliateId, [
      'affiliateDocuments',
    ]);

    if (!affiliateDocuments.length) return affiliateDocuments;

    const procedureDocumentIds = affiliateDocuments.map(
      ({ procedureDocumentId }) => procedureDocumentId,
    );

    const documentNames = await this.nats.firstValue('procedureDocuments.findAllByIds', {
      ids: procedureDocumentIds,
    });

    const documentsAffiliate = affiliateDocuments.map(({ procedureDocumentId }) => ({
      procedureDocumentId,
      ...documentNames[procedureDocumentId],
    }));

    return { status: documentNames.status, documentsAffiliate };
  }

  async findDocument(affiliateId: number, procedureDocumentId: number): Promise<Buffer> {
    const relation = 'affiliateDocuments';
    const column = 'procedureDocumentId';
    const data = procedureDocumentId;

    const [affiliate] = await Promise.all([
      this.findAndVerifyAffiliateWithRelationOneCondition(affiliateId, relation, column, data),
      this.ftp.connectToFtp(),
    ]);

    const documents = affiliate.affiliateDocuments;

    if (documents.length === 0) throw new RpcException({message: 'Document not found', code: 404});

    const firstDocument = documents[0];

    const documentDownload = await this.ftp.downloadFile(firstDocument.path);

    this.ftp.onDestroy();

    return documentDownload;
  }

  async collateDocuments(affiliateId: number, modalityId: number): Promise<any> {
    const [affiliate, modality] = await Promise.all([
      this.findAndVerifyAffiliateWithRelations(affiliateId, ['affiliateDocuments']),
      this.nats.firstValue('modules.findDataRelations', {
        id: modalityId,
        relations: ['procedureRequirements', 'procedureRequirements.procedureDocument'],
        entity: 'procedureModality',
      }),
    ]);

    if (!modality.status) return modality;

    const { affiliateDocuments } = affiliate;
    const { procedureRequirements } = modality;

    if (!procedureRequirements.length) {
      return { status: false, message: 'No hay documentos requeridos' };
    }

    const affiliateDocumentsSet = new Set(affiliateDocuments.map((doc) => doc.procedureDocumentId));
    const requiredDocuments = new Map<number, any[]>();
    const additionallyDocumentsUpload: any[] = [];
    const additionallyDocuments: any[] = [];

    for (const { procedureDocument, id, number } of procedureRequirements) {
      const documentData = {
        procedureRequirementId: id,
        number,
        procedureDocumentId: procedureDocument.id,
        name: procedureDocument.name,
        shortened: procedureDocument.shortened,
        isUploaded: affiliateDocumentsSet.has(procedureDocument.id),
      };

      if (number === 0) {
        (documentData.isUploaded ? additionallyDocumentsUpload : additionallyDocuments).push(
          documentData,
        );
      } else {
        if (!requiredDocuments.has(number)) {
          requiredDocuments.set(number, []);
        }
        requiredDocuments.get(number)?.push(documentData);
      }
    }

    requiredDocuments.forEach((docs, key) => {
      requiredDocuments.set(
        key,
        docs.some((doc) => doc.isUploaded) ? [docs.find((doc) => doc.isUploaded)!] : docs,
      );
    });

    return {
      status: modality.status,
      requiredDocuments: Object.fromEntries(requiredDocuments),
      additionallyDocumentsUpload,
      additionallyDocuments,
    };
  }

  private async findAndVerifyAffiliateWithRelations(
    id: number,
    relations: string[] = [],
  ): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id },
      relations: relations.length > 0 ? relations : [],
    });
    if (!affiliate) {
      throw new RpcException({message: `Affiliate with ID: ${id} not found`, code: 404});
    }
    return affiliate;
  }

  private async findAndVerifyAffiliateWithRelationOneCondition(
    id: number,
    relation: string,
    column: string,
    data: any,
  ): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository
      .createQueryBuilder('affiliate')
      .leftJoinAndSelect(`affiliate.${relation}`, 'relation', `relation.${column} = :data`, {
        data,
      })
      .where('affiliate.id = :id', { id })
      .getOne();

    if (!affiliate) {
      throw new RpcException({message: `Affiliate with ID: ${id} not found`, code: 404});
    }
    return affiliate;
  }
}
