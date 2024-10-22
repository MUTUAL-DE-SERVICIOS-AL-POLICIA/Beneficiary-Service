import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto, FtpService, NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Affiliate, AffiliateDocument } from './entities';

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

    if (!affiliate) throw new NotFoundException(`Affiliate with: ${id} not found`);
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
        'is_active',
        'hierarchy',
      ]),
      this.nats.fetchAndClean(unitId, 'units.findOne', [
        'created_at',
        'updated_at',
        'deleted_at',
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
    affiliate_id: number,
    procedure_document_id: number,
    document_pdf: Buffer,
  ): Promise<{ message: string }> {
    const [document, affiliate] = await Promise.all([
      this.nats.firstValue('procedureDocuments.findOne', { id: procedure_document_id }),
      this.findAndVerifyAffiliateWithRelationOneCondition(
        affiliate_id,
        'affiliateDocuments',
        'procedure_document_id',
        procedure_document_id,
      ),
      this.ftp.connectToFtp(),
    ]);

    const initialPath = `Affiliate/Documents/${affiliate_id}/`;

    if (document.status === false)
      throw new NotFoundException('Servicio de documentos no disponible');
    let affiliateDocument: AffiliateDocument;
    let response: string;
    if (affiliate.affiliateDocuments.length === 0) {
      affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedure_document_id = procedure_document_id;
      affiliateDocument.path = `${initialPath}${document.name}.pdf`;
      response = 'Creado';
    } else {
      affiliateDocument = affiliate.affiliateDocuments[0];
      affiliateDocument.updated_at = new Date();
      response = 'Actualizado';
    }

    await Promise.all([
      this.affiliateDocumentsRepository.save(affiliateDocument),
      this.ftp.uploadFile(document_pdf, initialPath, affiliateDocument.path),
    ]);

    this.ftp.onDestroy();

    return {
      message: `${document.name} ${response} exitosamente`,
    };
  }

  async showDocuments(id: number): Promise<AffiliateDocument[]> {
    try {
      const affiliate = await this.findAndVerifyAffiliateWithRelations(id, ['affiliateDocuments']);
      const affiliateDocuments = affiliate.affiliateDocuments;

      if (affiliateDocuments.length === 0) return affiliateDocuments;

      const procedureDocumentIds = affiliateDocuments.map((doc) => doc.procedure_document_id);

      const documentNames = await firstValueFrom(
        this.client.send('procedureDocuments.findAllByIds', { ids: procedureDocumentIds }),
      );

      const mappedDocuments = affiliateDocuments.map((doc) => {
        const name = documentNames[doc.procedure_document_id] || 'Unknown Document';
        return {
          ...doc,
          name,
        };
      });

      return mappedDocuments;
    } catch (error) {
      //return [];
      this.handleDBException(error);
    }
  }

  async findDocument(affiliate_id: number, procedure_document_id: number): Promise<Buffer> {
    try {
      const relation = 'affiliateDocuments';
      const column = 'procedure_document_id';
      const data = procedure_document_id;

      const [affiliate] = await Promise.all([
        this.findAndVerifyAffiliateWithRelationOneCondition(affiliate_id, relation, column, data),
        this.ftpService.connectToFtp(),
      ]);

      const documents = affiliate.affiliateDocuments;

      if (documents.length === 0) throw new NotFoundException('Document not found');

      const firstDocument = documents[0];

      const documentDownload = await this.ftpService.downloadFile(firstDocument.path);

      return documentDownload;
    } catch (error) {
      this.handleDBException(error);
      throw error;
    } finally {
      this.ftpService.onDestroy();
    }
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
      throw new NotFoundException(`Affiliate with ID: ${id} not found`);
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
      throw new NotFoundException(`Affiliate not found with ID ${id}`);
    }
    return affiliate;
  }

  private handleDBException(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexecpected Error');
  }
}
