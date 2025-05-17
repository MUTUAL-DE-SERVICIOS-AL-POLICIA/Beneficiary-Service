import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NATS_SERVICE } from '../../config';

export class NatsService {
  private logger = new Logger('MicroserviceUtils');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  async firstValue(service: string, data: any): Promise<any> {
    return firstValueFrom(
      this.client.send(service, data).pipe(
        map((response) => ({
          ...response,
          status: true,
        })),
        catchError((error) => {
          this.logger.error(`Error calling microservice: ${service}`, error.message);
          return of({
            status: false,
            message: 'Microservice call failed',
          });
        }),
      ),
    );
  }

  async fetchAndClean(entityId: number | undefined, service: string, keysToOmit: string[]) {
    if (!entityId) return null;
    const data = await this.firstValue(service, { id: entityId });
    if (!data) return null;
    keysToOmit.forEach((key) => delete data[key]);
    return data;
  }

  async fistValueExclude(params: any, service: string, keysToOmit: string[]) {
    if (!params) return null;
    const data = await this.firstValue(service, params);
    if (!data) return null;
    keysToOmit.forEach((key) => delete data[key]);
    return data;
  }

  async firstValueInclude(params: any, service: string, keysToInclude: string[]) {
    if (!params) return null;
    const data = await this.firstValue(service, params);
    if (!data) return null;
    const filteredData = Object.fromEntries(
      keysToInclude.filter((key) => key in data).map((key) => [key, data[key]]),
    );
    return {
      ...filteredData,
      status: data.status,
    };
  }
}
