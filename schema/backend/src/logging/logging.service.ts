import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggingService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.logger = winston.createLogger({
      level: this.configService.get<string>('logging.level', 'debug'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'ISO' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'schemabooks-api',
        environment: this.configService.get<string>('nodeEnv'),
      },
      transports: [
        new winston.transports.Console({
          format:
            this.configService.get<string>('nodeEnv') === 'development'
              ? winston.format.combine(winston.format.colorize(), winston.format.simple())
              : winston.format.json(),
        }),
      ],
    });
  }

  log(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>) {
    this.logger.verbose(message, { context, ...meta });
  }

  logEvent(event: {
    action: string;
    correlationId: string;
    userId?: string;
    businessId?: string;
    entityType?: string;
    entityId?: string;
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: Record<string, unknown>;
  }) {
    this.logger.info(`audit:${event.action}`, {
      event_type: 'audit',
      ...event,
    });
  }
}
