import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person, PersonAffiliate } from './entities';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [PersonsController],
  providers: [PersonsService],
  imports: [TypeOrmModule.forFeature([Person, PersonAffiliate]), NatsModule],
})
export class PersonsModule {}
