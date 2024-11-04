import { Catch, ArgumentsHost, ExceptionFilter, BadRequestException, Logger } from '@nestjs/common';

//import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch(BadRequestException)
export class BadRequestCustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('BadRequestCustomExceptionFilter');
  catch(exception: BadRequestException, host: ArgumentsHost) {
    this.logger.debug('BadRequestCustomExceptionFilter');

    const context = host.switchToRpc();
    const response: any = exception.getResponse();
    const err = {
      ...response,
      data: context.getData(),
      ...context.getContext(),
    };
    this.logger.error(err);

    const error = err ?? 'Internal server error';
    return throwError(() => error);
  }
}
