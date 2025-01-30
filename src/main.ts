import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NastEnvs } from './config';
import { RpcCustomExceptionFilter, BadRequestCustomExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: NastEnvs.natsServers,
    },
  });

  //app.setGlobalPrefix('api');
  app.useGlobalFilters(new RpcCustomExceptionFilter(), new BadRequestCustomExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen();
}
bootstrap();
