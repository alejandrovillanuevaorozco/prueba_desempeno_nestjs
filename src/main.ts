import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

/**
 * Bootstrap Application Entrypoint
 * 
 * In this entrypoint, I bootstrap the NestJS application instance, configure global
 * validation pipelines, and set up the interactive Swagger OpenAPI documentation.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. I retrieve port configuration from the environment (defaulting to 3000)
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // 2. I enable Cross-Origin Resource Sharing (CORS) for web clients
  app.enableCors();

  // 3. I register a global ValidationPipe to enforce DTO type safety and strip unknown properties
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

  // 4. I configure Swagger OpenAPI documentation with both JWT and x-api-key security definitions
  const config = new DocumentBuilder()
    .setTitle('FleetCore API — Vehicle Fleet Maintenance Management')
    .setDescription(
      'Enterprise RESTful API for FleetCore fleet maintenance management, mechanics scheduling, workshop assignment, and vehicle lifecycle synchronization.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (obtained from POST /auth/login)',
        in: 'header',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key for external integrations (e.g. demo-key-partner-1)',
      },
      'x-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // 5. I bind the HTTP server to the designated port
  await app.listen(port);
  logger.log(`🚀 FleetCore API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();

