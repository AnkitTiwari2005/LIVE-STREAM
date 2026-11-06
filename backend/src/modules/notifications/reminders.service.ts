import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from './mailer.service';
import { StreamStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async addReminder(userId: string, streamId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.isEmailVerified) {
      throw new BadRequestException('Email address must be verified before subscribing to reminders (FR-A2)');
    }

    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    if (stream.status !== StreamStatus.SCHEDULED) {
      throw new BadRequestException('Reminders can only be scheduled for upcoming streams');
    }

    await this.prisma.streamReminder.upsert({
      where: {
        userId_streamId: { userId, streamId },
      },
      update: {},
      create: {
        userId,
        streamId,
      },
    });

    return { message: 'Reminder set successfully. You will receive an email 15 minutes before the stream.' };
  }

  async removeReminder(userId: string, streamId: string) {
    try {
      await this.prisma.streamReminder.delete({
        where: {
          userId_streamId: { userId, streamId },
        },
      });
      return { message: 'Reminder removed' };
    } catch {
      return { message: 'Reminder was not active' };
    }
  }

  /**
   * Scans for scheduled streams starting in the next 15 minutes and dispatches reminder emails (FR-N3)
   */
  async dispatch15MinuteReminders() {
    const now = new Date();
    const in15Min = new Date(now.getTime() + 16 * 60 * 1000);

    const dueReminders = await this.prisma.streamReminder.findMany({
      where: {
        isSent15Min: false,
        stream: {
          status: StreamStatus.SCHEDULED,
          scheduledAt: { gte: now, lte: in15Min },
        },
        user: { emailNotification: true },
      },
      include: {
        user: true,
        stream: { include: { streamer: true } },
      },
    });

    for (const item of dueReminders) {
      await this.mailer.send15MinuteReminder(
        item.user.email,
        item.user.name,
        item.stream.title,
        item.stream.streamer.name,
        item.stream.id,
      );

      await this.prisma.streamReminder.update({
        where: { id: item.id },
        data: { isSent15Min: true },
      });
    }

    if (dueReminders.length > 0) {
      this.logger.log(`Dispatched ${dueReminders.length} 15-minute reminder emails.`);
    }
  }
}
