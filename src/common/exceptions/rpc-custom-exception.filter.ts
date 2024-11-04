import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';

import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    console.log('RpcCustomExceptionFilter');

    const context = host.switchToRpc();
    console.log(context.getData());
    console.log(exception.message);
    const error = exception.message ?? 'Internal server error';

    throw new RpcException({
      statusCode: 500,
      message: error || 'An unexpected error occurred.',
    });
  }
}
