import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Sends email through any SMTP provider (Brevo in .env); switching provider only changes .env.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transport?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  private getTransport() {
    if (!this.transport) {
      const port = Number(this.config.get<string>('SMTP_PORT', '2525'));
      this.transport = nodemailer.createTransport({
        host: this.config.getOrThrow<string>('SMTP_HOST'),
        port,
        secure: port === 465,
        auth: {
          user: this.config.getOrThrow<string>('SMTP_USER'),
          pass: this.config.getOrThrow<string>('SMTP_PASS'),
        },
      });
    }
    return this.transport;
  }

  async send(to: string, subject: string, text: string, html?: string) {
    await this.getTransport().sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Mail sent: "${subject}"`);
  }
}
