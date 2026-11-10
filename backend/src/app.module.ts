import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

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
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { StorageModule } from './modules/storage/storage.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CronTasksService } from './jobs/cron-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // H-09 / N-08: Global rate limit — configurable per-IP cap (default 300 req/min).
    // Infrastructure endpoints (health, webhooks, meter-tick) use @SkipThrottle();
    // sensitive auth endpoints are further restricted via @Throttle() on their controllers.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: Number(process.env.THROTTLE_LIMIT) || 300 }]),
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
    PaymentsModule,
    WalletModule,
    StorageModule,
  ],
  providers: [
    CronTasksService,
    // H-09: ThrottlerGuard runs before JWT and Roles so rate-limiting fires even on
    // unauthenticated endpoints (login, register, forgot-password).
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
