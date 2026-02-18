import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggingService } from './logging/logging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = app.get(LoggingService);

  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('nodeEnv') === 'development' ? true : [],
    credentials: true,
  });

  // Global prefix
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Schema Books API')
    .setDescription(
      'Schema Books — Tax & Bookkeeping Dashboard SaaS — Backend API.\n\n' +
        'Provides secure multi-tenant API with immutable ledger, revision control, ' +
        'receipt management, and full audit logging.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${configService.get<number>('port')}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `Application running on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger docs at http://localhost:${port}/${apiPrefix}/docs`,
    'Bootstrap',
  );
}

bootstrap();
