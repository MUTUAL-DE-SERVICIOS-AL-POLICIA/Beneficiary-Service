import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Affiliate, AffiliateDocument } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of } from 'rxjs';
import { FtpService } from '../ftp/ftp.service';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger('AffiliateDocumentsService');

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
    @InjectRepository(AffiliateDocument)
    private readonly affiliateDocumentsRepository: Repository<AffiliateDocument>,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private ftpService: FtpService,
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
    try {
      const affiliate = await this.findAndVerifyAffiliateWithRelations(id, [
        'affiliateState',
        'affiliateState.stateType',
      ]);

      const [dataDegree, dataUnit, dataCategory] = await Promise.all([
        affiliate.degreeId ? this.callMS({ id: affiliate.degreeId }, 'degrees.findOne') : null,
        affiliate.unitId ? this.callMS({ id: affiliate.unitId }, 'units.findOne') : null,
        affiliate.categoryId
          ? this.callMS({ id: affiliate.categoryId }, 'categories.findOne')
          : null,
      ]);

      const { createdAt, updatedAt, deletedAt, degreeId, unitId, categoryId, ...dataAffiliate } =
        affiliate || {};
      const {
        code: degreeCode,
        shortened: degreeShortened,
        correlative,
        is_active,
        hierarchy,
        ...degree
      } = dataDegree || {};
      const {
        created_at,
        updated_at,
        deleted_at,
        breakdown,
        code: unitCode,
        shortened: unitShortened,
        ...unit
      } = dataUnit || {};
      const { from, to, ...category } = dataCategory;

      const totalAffiliate = {
        ...dataAffiliate,
        degree,
        unit,
        category,
      };

      return totalAffiliate;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async createDocuments(
    affiliate_id: number,
    procedure_document_id: number,
    document_pdf: Buffer,
  ): Promise<{ status: number; message: string }> {
    try {
      const [document, affiliate] = await Promise.all([
        firstValueFrom(
          this.client.send('procedureDocuments.findOne', { id: procedure_document_id }),
        ),
        this.findAndVerifyAffiliateWithRelations(affiliate_id),
        this.ftpService.connectToFtp(),
      ]);

      const initialPath = `Affiliate/Documents/${affiliate_id}/`;

      const affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedure_document_id = procedure_document_id;
      affiliateDocument.path = `${initialPath}${document.name}.pdf`;

      const verifyPath = `${process.env.FTP_ROOT}${initialPath}`;
      const remotePath = `${process.env.FTP_ROOT}${affiliateDocument.path}`;

      await Promise.all([
        this.affiliateDocumentsRepository.save(affiliateDocument),
        this.ftpService.uploadFile(document_pdf, verifyPath, remotePath),
      ]);

      return {
        status: 201,
        message: `${document.name} Guardado exitosamente`,
      };
    } catch (error) {
      this.handleDBException(error);
    } finally {
      this.ftpService.onDestroy();
    }
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

  private async callMS(data: any, service: string): Promise<any> {
    return firstValueFrom(
      this.client.send(service, data).pipe(
        catchError((error) => {
          this.logger.error(`Error calling microservice: ${service}`, error.message);
          return of({ status: 's/n' });
        }),
      ),
    );
  }
}
