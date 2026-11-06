import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for cryptographic SHA-256 HMAC LiveKit Webhook verification
  });

  // Trust first proxy hop (Nginx with Cloudflare CF-Connecting-IP restoration)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled with custom policy via Nginx/Next.js
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'https://platform-domain.com',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Pooja & Astrology Live Streaming Platform API')
    .setDescription('Self-hosted WebRTC & Live Chat Platform API for Spiritual Broadcasts')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`API Server running on port ${port} with prefix /api/v1 (OpenAPI docs at /api/docs)`);
}

bootstrap();
