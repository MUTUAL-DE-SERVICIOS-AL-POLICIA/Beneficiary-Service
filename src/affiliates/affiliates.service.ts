import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateAffiliateDto, UpdateAffiliateDto } from './dto';
import { Affiliate, AffiliateDocument } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { envsFtp } from 'src/config';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger('AffiliateDocumentsService');

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
    @InjectRepository(AffiliateDocument)
    private readonly affiliateDocumentsRepository: Repository<AffiliateDocument>,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  create(createAffiliateDto: CreateAffiliateDto) {
    return 'This action adds a new affiliate';
  }

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

  update(id: number, updateAffiliateDto: UpdateAffiliateDto) {
    return `This action updates a #${id} affiliate`;
  }

  remove(id: number) {
    return `This action removes a #${id} affiliate`;
  }

  async createDocuments(
    affiliate_id: number,
    procedure_document_id: number,
    document_pdf: Buffer,
  ): Promise<{ status: number; message: string }> {
    const server = new ftp.Client();
    const ftpConnection = server.access({
      host: envsFtp.ftpHost,
      user: envsFtp.ftpUsername,
      password: envsFtp.ftpPassword,
      secure: envsFtp.ftpSsl,
    });
    try {
      const [document, affiliate] = await Promise.all([
        firstValueFrom(
          this.client.send('procedureDocuments.findOne', { id: procedure_document_id }),
        ),
        this.findAndVerifyAffiliateWithRelations(affiliate_id),
        ftpConnection,
      ]);

      const path = `AffiliateDocuments/${affiliate_id}/`

      const affiliateDocument = new AffiliateDocument();
      affiliateDocument.affiliate = affiliate;
      affiliateDocument.procedure_document_id = procedure_document_id;
      affiliateDocument.path = `${path}${document.name}.pdf`;

      const buffer = Buffer.from(document_pdf.buffer);
      const documentStream = Readable.from(buffer);
      let remoteFilePath = `${process.env.FTP_ROOT}${path}`;

      await server.ensureDir(remoteFilePath);
      await Promise.all([
          this.affiliateDocumentsRepository.save(affiliateDocument),
          server.uploadFrom(documentStream, `${process.env.FTP_ROOT}${affiliateDocument.path}`),
      ]);

      return {
        status: 201,
        message: `${document.name} Guardado exitosamente`,
      };
    } catch (error) {
      this.handleDBException(error);
    } finally {
      server.close();
    }
  }

  async showDocuments(id: number): Promise<any> {
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

  private handleDBException(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexecpected Error');
  }
}
