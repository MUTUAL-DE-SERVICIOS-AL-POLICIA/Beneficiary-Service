import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  DB_TEST_PASSWORD: string;
  DB_TEST_NAME: string;
  DB_TEST_HOST: string;
  DB_TEST_PORT: number;
  DB_TEST_USERNAME: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  natsServers: envVars.NATS_SERVERS,
  dbTestPassword: envVars.DB_TEST_PASSWORD,
  dbTestName: envVars.DB_TEST_NAME,
  dbTestHost: envVars.DB_TEST_HOST,
  dbTestPort: envVars.DB_TEST_PORT,
  dbTestUsername: envVars.DB_TEST_USERNAME,
};
