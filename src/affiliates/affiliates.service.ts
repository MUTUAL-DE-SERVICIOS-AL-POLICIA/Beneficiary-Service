import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { UpdateAffiliateDto } from './dto/update-affiliate.dto';
import { Affiliate } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger('AffiliateDocumentsService');

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
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
