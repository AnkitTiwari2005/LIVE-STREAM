import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from './mailer.service';
import { StreamStatus } from '@prisma/client';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  async submitContactInquiry(dto: { name: string; email: string; subject: string; message: string; ip?: string }) {
    await this.prisma.auditLog.create({
      data: {
        actorEmail: dto.email,
        action: 'CONTACT_FORM_SUBMITTED',
        targetResource: `Inquiry:${dto.email}`,
        details: { name: dto.name, subject: dto.subject, message: dto.message },
        ipAddress: dto.ip || null,
      },
    });

    try {
      const safeName = escapeHtml(dto.name);
      const safeSubject = escapeHtml(dto.subject);
      const safeMessage = escapeHtml(dto.message);

      await this.mailer.sendEmail({
        to: dto.email,
        toName: dto.name,
        subject: `Inquiry Received: ${dto.subject} - Shubhdarshan Support`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
            <h2 style="color: #c2410c;">Namaste ${safeName},</h2>
            <p>Thank you for reaching out to Shubhdarshan Devotee Support.</p>
            <p>We have logged your query regarding: <strong>${safeSubject}</strong></p>
            <blockquote style="background: #f9f9f9; padding: 12px; border-left: 4px solid #ea580c; font-style: italic;">${safeMessage}</blockquote>
            <p>Our devotee assistance team will inspect and respond to your email within 2 to 4 hours.</p>
            <p style="color: #666; font-size: 13px;">Shubhdarshan Devotional Media Private Limited</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch contact acknowledgment email: ${err.message}`);
    }

    return { success: true, message: 'Your support message has been received by our spiritual desk.' };
  }

  async submitGrievance(dto: { name: string; email: string; phone?: string; complaintType: string; details: string; ip?: string }) {
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketId = `GRV-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    await this.prisma.auditLog.create({
      data: {
        actorEmail: dto.email,
        action: 'IT_RULES_GRIEVANCE_SUBMITTED',
        targetResource: `Grievance:${ticketId}`,
        details: {
          ticketId,
          name: dto.name,
          phone: dto.phone,
          complaintType: dto.complaintType,
          details: dto.details,
        },
        ipAddress: dto.ip || null,
      },
    });

    try {
      const safeName = escapeHtml(dto.name);
      const safeType = escapeHtml(dto.complaintType);
      const safeDetails = escapeHtml(dto.details);

      await this.mailer.sendEmail({
        to: dto.email,
        toName: dto.name,
        subject: `Formal Grievance Registered [${ticketId}] - Rule 3(2) IT Rules 2021`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
            <h2 style="color: #c2410c;">Formal Acknowledgment of Grievance</h2>
            <p>Dear ${safeName},</p>
            <p>Your grievance submitted under Rule 3(2) of the Information Technology (Intermediary Guidelines) Rules, 2021 has been registered with Ticket Reference: <strong style="color: #ea580c;">${ticketId}</strong>.</p>
            <p><strong>Complaint Type:</strong> ${safeType}</p>
            <blockquote style="background: #f9f9f9; padding: 12px; border-left: 4px solid #ea580c;">${safeDetails}</blockquote>
            <p>The designated Resident Grievance Officer will investigate the matter and provide a reasoned decision within statutory timelines (within 15 calendar days).</p>
            <p style="color: #666; font-size: 13px;">Resident Grievance Officer, Shubhdarshan Devotional Media Private Limited</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch grievance acknowledgment email: ${err.message}`);
    }

    return {
      success: true,
      ticketId,
      message: `Your grievance has been officially registered with Ticket ID ${ticketId}. Formal acknowledgment sent via email.`,
    };
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
