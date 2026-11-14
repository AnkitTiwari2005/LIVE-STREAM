import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
  private smtpUser: string;
  private smtpPass: string;
  private smtpHost: string;
  private smtpPort: number;
  private senderEmail: string;
  private senderName: string;
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = process.env.EMAIL_FROM_ADDRESS || '12328.uspc@gmail.com';
    this.senderName = process.env.EMAIL_FROM_NAME || 'Shubhdarshan Live';

    this.smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    this.smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    this.smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || this.senderEmail;
    this.smtpPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || '';

    // Initialize SMTP transporter if SMTP password is provided
    if (this.smtpPass && !this.smtpPass.includes('placeholder')) {
      try {
        this.smtpTransporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpPort === 465,
          auth: {
            user: this.smtpUser,
            pass: this.smtpPass,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Could not initialize SMTP transport: ${err.message}`);
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // 1. Try Brevo REST API if an xkeysib- key is configured
    if (this.apiKey && this.apiKey.startsWith('xkeysib-') && !this.apiKey.includes('your_brevo_api_key')) {
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

        if (response.ok) {
          this.logger.log(`[Brevo REST API] Email successfully dispatched to ${options.to}: ${options.subject}`);
          return true;
        }

        const errorText = await response.text();
        this.logger.error(`[Brevo REST API] Dispatch failed (${response.status}): ${errorText}`);
      } catch (err: any) {
        this.logger.error(`[Brevo REST API] Network error: ${err.message}`);
      }
    }

    // 2. Try SMTP Relay via Nodemailer if SMTP transporter is configured
    if (this.smtpTransporter) {
      try {
        const info = await this.smtpTransporter.sendMail({
          from: `"${this.senderName}" <${this.senderEmail}>`,
          to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
          subject: options.subject,
          html: options.htmlContent,
        });

        this.logger.log(`[Brevo SMTP] Email successfully dispatched to ${options.to} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[Brevo SMTP] Delivery error to ${options.to}: ${err.message}`);
      }
    }

    // 3. Fallback: Log email contents so verification links are always accessible
    this.logger.warn(`[DEV/MOCK EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}`);
    const linkMatch = options.htmlContent.match(/href="([^"]+)"/);
    if (linkMatch && linkMatch[1]) {
      this.logger.warn(`[MOCK VERIFY URL]: ${linkMatch[1]}`);
    }

    return true;
  }

  private getOrigin(): string {
    return (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const origin = this.getOrigin();
    const link = `${origin}/verify-email?token=${token}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Verify your email address - Shubhdarshan Live',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f3e8e2; border-radius: 12px; background: #fffcf9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #b45309; font-size: 24px; margin: 0;">Shubhdarshan</h1>
            <p style="color: #78716c; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Sacred Darshan Network</p>
          </div>
          <h2 style="color: #9a3412;">Namaste ${name},</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
            Thank you for joining our spiritual live streaming platform.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
            Please click the sacred button below to verify your email address, receive your <strong>100 Free Welcome Coins</strong>, and unlock live community chat and darshan reminders:
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${link}" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.25);">Verify Email &amp; Claim 100 Coins</a>
          </div>
          <p style="color: #78716c; font-size: 12px; line-height: 1.5;">
            Or copy and paste this verification URL into your browser:<br/>
            <a href="${link}" style="color: #b45309; word-break: break-all;">${link}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #f0e6dc; margin: 25px 0;" />
          <p style="color: #a8a29e; font-size: 11px; text-align: center; margin: 0;">
            If you did not create an account on Shubhdarshan, you can safely disregard this email.<br/>
            Har Har Mahadev 🙏
          </p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const origin = this.getOrigin();
    const link = `${origin}/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Reset your password - Shubhdarshan Live',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f3e8e2; border-radius: 12px; background: #fffcf9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #b45309; font-size: 24px; margin: 0;">Shubhdarshan</h1>
            <p style="color: #78716c; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Sacred Darshan Network</p>
          </div>
          <h2 style="color: #9a3412;">Namaste ${name},</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
            We received a request to reset your password on the Shubhdarshan Live platform.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
            Click the button below to choose a new password. This link is valid for 1 hour:
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${link}" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #78716c; font-size: 12px; line-height: 1.5;">
            If you did not request this, you can safely ignore this email. Your account remains secure.
          </p>
        </div>
      `,
    });
  }

  async send15MinuteReminder(to: string, name: string, streamTitle: string, streamerName: string, streamId: string) {
    const origin = this.getOrigin();
    const streamUrl = `${origin}/stream/${streamId}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: `Starting in 15 Minutes: ${streamTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 20px;">
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
    const origin = this.getOrigin();
    const streamUrl = `${origin}/stream/${streamId}`;
    return this.sendEmail({
      to,
      toName: name,
      subject: `LIVE NOW: ${streamerName} is Live - ${streamTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: auto; padding: 20px;">
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
