import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FingerprintType, Person, PersonAffiliate, PersonFingerprint } from './entities';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [PersonsController],
  providers: [PersonsService],
  imports: [
    TypeOrmModule.forFeature([Person, PersonAffiliate, FingerprintType, PersonFingerprint]),
    NatsModule,
  ],
})
export class PersonsModule {}
