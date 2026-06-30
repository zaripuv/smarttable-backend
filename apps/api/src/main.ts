import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  app.useLogger(logger);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
  });

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api'));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('API_VERSION', '1'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new TransformInterceptor());

  app.useWebSocketAdapter(new IoAdapter(app));

  if (configService.get<string>('SWAGGER_ENABLED', 'true') === 'true') {
    const config = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE', 'SmartTable API'))
      .setDescription(
        configService.get<string>('SWAGGER_DESCRIPTION', 'SmartTable API Documentation'),
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION', '1.0'))
      .addBearerAuth()
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Restaurants', 'Restaurant management')
      .addTag('Branches', 'Branch management')
      .addTag('Tables', 'Table management')
      .addTag('QR Codes', 'QR Code management')
      .addTag('Categories', 'Category management')
      .addTag('Products', 'Product management')
      .addTag('Orders', 'Order management')
      .addTag('Payments', 'Payment management')
      .addTag('Reviews', 'Review management')
      .addTag('Notifications', 'Notification management')
      .addTag('Employees', 'Employee management')
      .addTag('Subscriptions', 'Subscription management')
      .addTag('Analytics', 'Analytics & Dashboard')
      .addTag('Settings', 'Settings management')
      .addTag('Upload', 'File upload')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs available at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
