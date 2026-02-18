import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggingService } from '../../logging/logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const correlationId = (request as any).correlationId || 'unknown';
    const userId = request.user?.sub;
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url}`, 'HTTP', {
      correlationId,
      userId,
      ip,
      method,
      url,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.log(`← ${method} ${url} ${response.statusCode} (${duration}ms)`, 'HTTP', {
            correlationId,
            userId,
            statusCode: response.statusCode,
            duration,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `← ${method} ${url} ${error.status || 500} (${duration}ms)`,
            error.stack,
            'HTTP',
            {
              correlationId,
              userId,
              statusCode: error.status || 500,
              duration,
              errorMessage: error.message,
            },
          );
        },
      }),
    );
  }
}
