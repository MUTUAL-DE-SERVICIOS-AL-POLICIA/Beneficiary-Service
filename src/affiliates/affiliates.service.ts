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
