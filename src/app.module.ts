import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { PersonAffiliateModule } from './person_affiliate/person_affiliate.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true
    }),
    PersonsModule,
    CommonModule,
    AffiliatesModule,
    PersonAffiliateModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
