import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { FtpModule } from './ftp/ftp.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    PersonsModule,
    CommonModule,
    AffiliatesModule,
    FtpModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
