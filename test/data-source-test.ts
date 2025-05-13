import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { DbEnvsTest, DbEnvs } from '../src/config/envs';
import { PersonAffiliate } from '../src/persons/entities/person-affiliate.entity';
import { Person } from '../src/persons/entities/person.entity';

config();

export const optionsTest: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: DbEnvsTest.dbTestHost,
  port: DbEnvsTest.dbTestPort,
  database: DbEnvsTest.dbTestDatabase,
  username: DbEnvsTest.dbTestUsername,
  password: DbEnvsTest.dbTestPassword,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // entities: [Person, PersonAffiliate],
  synchronize: true,
  dropSchema: true,
  namingStrategy: new SnakeNamingStrategy(),

  seeds: ['src/database/seeds/**/*{.ts,.js}'],
  seedTracking: true,

  schema: DbEnvs.dbSchema,
  migrations: ['dist/database/migrations/**/*{.ts,.js}'],
};

export default new DataSource(optionsTest);
