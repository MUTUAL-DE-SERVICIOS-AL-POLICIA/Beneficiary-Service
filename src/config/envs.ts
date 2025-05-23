import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  NATS_SERVERS: string[];
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_SYNCHRONIZE: boolean;
  DB_SCHEMA: string;
  FTP_HOST: string;
  FTP_USERNAME: string;
  FTP_PASSWORD: string;
  FTP_ROOT: string;
  FTP_SSL: boolean;
  FTP_FINGERPRINTS: string;
  FTP_DOCUMENTS: string;
  FTP_IMPORT_DOCUMENTS_PVTBE: string;
}

const envsSchema = joi
  .object({
    NATS_SERVERS: joi.array().items(joi.string()).required(),

    FTP_HOST: joi.string(),
    FTP_USERNAME: joi.string(),
    FTP_PASSWORD: joi.string(),
    FTP_ROOT: joi.string(),
    FTP_SSL: joi.boolean(),

    DB_PASSWORD: joi.string().required(),
    DB_DATABASE: joi.string().required(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_SYNCHRONIZE: joi.string().valid('true', 'false').default('false'),
    DB_SCHEMA: joi.string().default('beneficiaries'),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
  DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE?.toLowerCase(),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = {
  ...value,
  DB_SYNCHRONIZE: value.DB_SYNCHRONIZE === 'true',
};

export const NastEnvs = {
  natsServers: envVars.NATS_SERVERS,
};

export const DbEnvs = {
  dbPassword: envVars.DB_PASSWORD,
  dbDatabase: envVars.DB_DATABASE,
  dbHost: envVars.DB_HOST,
  dbPort: envVars.DB_PORT,
  dbUsername: envVars.DB_USERNAME,
  dbSynchronize: envVars.DB_SYNCHRONIZE,
  dbSchema: envVars.DB_SCHEMA,
};

export const envsFtp = {
  ftpHost: envVars.FTP_HOST,
  ftpUsername: envVars.FTP_USERNAME,
  ftpPassword: envVars.FTP_PASSWORD,
  ftpRoot: envVars.FTP_ROOT,
  ftpSsl: envVars.FTP_SSL,
  ftpFingerprints: envVars.FTP_FINGERPRINTS,
  ftpDocuments: envVars.FTP_DOCUMENTS,
  ftpImportDocumentsPvtbe: envVars.FTP_IMPORT_DOCUMENTS_PVTBE,
};
