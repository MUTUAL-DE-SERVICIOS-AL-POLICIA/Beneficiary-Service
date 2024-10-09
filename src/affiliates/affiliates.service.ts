import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { UpdateAffiliateDto } from './dto/update-affiliate.dto';
import { Affiliate } from './entities/affiliate.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';

@Injectable()
export class AffiliatesService {
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
  
  private async findAndVerifyAffiliateWithRelations(id: number, relations: string[] = []): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id },
      relations: relations.length > 0 ? relations : [],
    });
    if (!affiliate) {
      throw new NotFoundException(`Affiliate with ID: ${id} not found`);
    }
    return affiliate;
  }
}
