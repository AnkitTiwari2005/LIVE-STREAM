import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { RemindersService } from './reminders.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [MailerService, RemindersService],
  exports: [MailerService, RemindersService],
})
export class NotificationsModule {}
