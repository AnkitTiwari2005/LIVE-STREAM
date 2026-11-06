import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  process.env.RUN_CRONS = 'true';

  // Worker runs headless (no HTTP server port listener needed)
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  logger.log('Pooja Platform Background Worker & Cron Scheduler is running.');
}

bootstrap();
