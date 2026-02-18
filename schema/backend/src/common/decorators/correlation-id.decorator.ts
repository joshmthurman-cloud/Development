import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId || request.headers[CORRELATION_ID_HEADER] || 'unknown';
  },
);
