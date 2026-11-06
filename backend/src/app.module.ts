import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './database/prisma.module';
import { VideoModule } from './modules/video/video.module';
import { AuthModule } from './modules/auth/auth.module';
import { StreamersModule } from './modules/streamers/streamers.module';
import { StreamsModule } from './modules/streams/streams.module';
import { PrivateLinksModule } from './modules/private-links/private-links.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { InternalModule } from './modules/internal/internal.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CronTasksService } from './jobs/cron-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    VideoModule,
    AuthModule,
    StreamersModule,
    StreamsModule,
    PrivateLinksModule,
    ChatModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    InternalModule,
    HealthModule,
  ],
  providers: [
    CronTasksService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
