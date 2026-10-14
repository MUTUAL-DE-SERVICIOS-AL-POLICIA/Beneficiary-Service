import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { DatabaseModule } from './database/database.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, PersonsModule, CommonModule, AffiliatesModule, ReportsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
