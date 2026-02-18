import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';

import { PrismaModule } from './prisma/prisma.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CategoriesModule } from './categories/categories.module';
import { FiscalYearsModule } from './fiscal-years/fiscal-years.module';
import { LedgerModule } from './ledger/ledger.module';
import { RevisionsModule } from './revisions/revisions.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { TemplatesModule } from './templates/templates.module';
import { OfficeInHomeModule } from './office-in-home/office-in-home.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';
import { HealthModule } from './health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    // Global infrastructure
    PrismaModule,
    LoggingModule,
    RedisModule,
    StorageModule,
    AuditModule,

    // Feature modules
    AuthModule,
    UsersModule,
    BusinessesModule,
    CategoriesModule,
    FiscalYearsModule,
    LedgerModule,
    RevisionsModule,
    ReceiptsModule,
    TemplatesModule,
    OfficeInHomeModule,
    FixedAssetsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
