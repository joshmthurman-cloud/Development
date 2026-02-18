import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggingService } from '../../logging/logging.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request as any).correlationId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object') {
        message = (responseBody as any).message || message;
        errors = (responseBody as any).errors;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        'ExceptionFilter',
        { correlationId, status, path: request.url },
      );
    } else {
      this.logger.warn(`Client error: ${status} ${message}`, 'ExceptionFilter', {
        correlationId,
        status,
        path: request.url,
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      errors,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
