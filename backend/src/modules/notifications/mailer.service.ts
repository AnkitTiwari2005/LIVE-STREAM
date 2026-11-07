import { Injectable, Logger } from '@nestjs/common';

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = process.env.EMAIL_FROM_ADDRESS || 'notifications@platform-domain.com';
    this.senderName = process.env.EMAIL_FROM_NAME || 'Shubhdarshan Live';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey || this.apiKey.startsWith('xkeysib-replace')) {
      this.logger.warn(`[DEV/MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: options.to, name: options.toName || options.to }],
          subject: options.subject,
          htmlContent: options.htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo SMTP dispatch failed: ${errorText}`);
        return false;
      }
      this.logger.log(`Email dispatched to ${options.to}: ${options.subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Email delivery error: ${err.message}`);
      return false;
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const origin = process.env.FRONTEND_ORIGIN || 'https://platform-domain.com';
    const link = `${origin}/verify-email?token=${token}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Verify your email address - Shubhdarshan Live',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
          <h2 style="color: #c2410c;">Namaste ${name},</h2>
          <p>Thank you for joining our spiritual live streaming platform.</p>
          <p>Please click the button below to verify your email address, receive your 100 bonus coins, and unlock live chat and reminders:</p>
          <div style="margin: 25px 0;">
            <a href="${link}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p style="color: #666; font-size: 13px;">If you did not register on our platform, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const origin = process.env.FRONTEND_ORIGIN || 'https://platform-domain.com';
    const link = `${origin}/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Reset your password - Shubhdarshan Live',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
          <h2 style="color: #c2410c;">Namaste ${name},</h2>
          <p>We received a request to reset your password on the Shubhdarshan Live platform.</p>
          <p>Click the button below to choose a new password. This link is valid for 1 hour:</p>
          <div style="margin: 25px 0;">
            <a href="${link}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px;">If you did not request this, you can safely ignore this email. Your account remains secure.</p>
        </div>
      `,
    });
  }

  async send15MinuteReminder(to: string, name: string, streamTitle: string, streamerName: string, streamId: string) {
    const origin = process.env.FRONTEND_ORIGIN || 'https://platform-domain.com';
    const streamUrl = `${origin}/stream/${streamId}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: `Starting in 15 Minutes: ${streamTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
          <h2 style="color: #c2410c;">🪔 Sacred Reminder: Live Darshan in 15 Minutes</h2>
          <p>Namaste ${name},</p>
          <p>The scheduled live session <strong>"${streamTitle}"</strong> conducted by <strong>${streamerName}</strong> is starting in 15 minutes.</p>
          <div style="margin: 25px 0;">
            <a href="${streamUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Live Pooja Room</a>
          </div>
          <p style="color: #666; font-size: 13px;">Har Har Mahadev 🙏</p>
        </div>
      `,
    });
  }

  async sendStreamLiveAlert(to: string, name: string, streamTitle: string, streamerName: string, streamId: string) {
    const origin = process.env.FRONTEND_ORIGIN || 'https://platform-domain.com';
    const streamUrl = `${origin}/stream/${streamId}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: `LIVE NOW: ${streamerName} is Live - ${streamTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto;">
          <h2 style="color: #c2410c;">🔔 Live Broadcast Started</h2>
          <p>Namaste ${name},</p>
          <p><strong>${streamerName}</strong> has just started broadcasting: <strong>"${streamTitle}"</strong>.</p>
          <div style="margin: 25px 0;">
            <a href="${streamUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Watch Live Now</a>
          </div>
        </div>
      `,
    });
  }
}
