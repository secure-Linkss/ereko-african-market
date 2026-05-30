import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  passwordResetTemplate,
  orderConfirmationTemplate,
  magicLinkTemplate,
  welcomeTemplate,
  orderStatusUpdateTemplate,
  adminNewOrderAlertTemplate,
  adminReturnAlertTemplate,
  PasswordResetContext,
  OrderConfirmationContext,
  MagicLinkContext,
  WelcomeContext,
  OrderStatusUpdateContext,
  AdminNewOrderAlertContext,
  AdminReturnAlertContext,
} from './email.templates';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<number>('email.port') === 465,
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      socketTimeout: 30_000,
      connectionTimeout: 10_000,
    });

    if (this.configService.get<string>('nodeEnv') !== 'test') {
      this.transporter.verify().then(() => {
        this.logger.log('SMTP connection verified');
      }).catch((err) => {
        this.logger.warn(`SMTP connection failed: ${err.message}. Emails will be logged but not sent.`);
      });
    }
  }

  // ─── Core Send ────────────────────────────────────────────────────────────

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const fromName = this.configService.get<string>('email.fromName');
    const fromAddr = this.configService.get<string>('email.from');
    const nodeEnv = this.configService.get<string>('nodeEnv');

    const mailOptions = {
      from: `"${fromName}" <${fromAddr}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo ?? fromAddr,
      headers: {
        'X-Mailer': 'EREKO-Mailer/1.0',
        'X-Priority': '3',
      },
    };

    if (nodeEnv === 'development' || nodeEnv === 'test') {
      this.logger.debug(
        `[EMAIL] To: ${options.to} | Subject: ${options.subject}\n${options.text}`,
      );

      if (nodeEnv === 'test') return;
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to} — MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
        error.stack,
      );
      // Do not rethrow — email failure should not crash the request
    }
  }

  // ─── Typed Send Methods ───────────────────────────────────────────────────

  async sendPasswordReset(ctx: PasswordResetContext & { email: string }): Promise<void> {
    const template = passwordResetTemplate({
      firstName: ctx.firstName,
      resetUrl: ctx.resetUrl,
      expiresInMinutes: 60,
    });

    await this.sendEmail({
      to: ctx.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendOrderConfirmation(
    ctx: OrderConfirmationContext & { email: string },
  ): Promise<void> {
    const template = orderConfirmationTemplate({
      firstName: ctx.firstName,
      orderNumber: ctx.orderNumber,
      orderTotal: ctx.orderTotal,
      orderItems: ctx.orderItems,
      shippingAddress: ctx.shippingAddress,
      orderUrl: ctx.orderUrl,
    });

    await this.sendEmail({
      to: ctx.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendMagicLink(ctx: MagicLinkContext & { email: string }): Promise<void> {
    const template = magicLinkTemplate({
      firstName: ctx.firstName,
      magicLinkUrl: ctx.magicLinkUrl,
      expiresInMinutes: 15,
    });

    await this.sendEmail({
      to: ctx.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendWelcome(ctx: WelcomeContext & { email: string }): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontend.url');
    const template = welcomeTemplate({
      firstName: ctx.firstName,
      loginUrl: ctx.loginUrl ?? `${frontendUrl}/login`,
    });

    await this.sendEmail({
      to: ctx.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendOrderStatusUpdate(ctx: OrderStatusUpdateContext & { email: string }): Promise<void> {
    const template = orderStatusUpdateTemplate(ctx);
    await this.sendEmail({ to: ctx.email, subject: template.subject, html: template.html, text: template.text });
  }

  async sendAdminNewOrderAlert(ctx: AdminNewOrderAlertContext & { adminEmails: string[] }): Promise<void> {
    if (!ctx.adminEmails.length) return;
    const template = adminNewOrderAlertTemplate(ctx);
    for (const email of ctx.adminEmails) {
      await this.sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
    }
  }

  async sendAdminReturnAlert(ctx: AdminReturnAlertContext & { adminEmails: string[] }): Promise<void> {
    if (!ctx.adminEmails.length) return;
    const template = adminReturnAlertTemplate(ctx);
    for (const email of ctx.adminEmails) {
      await this.sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
    }
  }

  async sendGeneric(opts: {
    email: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
  }): Promise<void> {
    await this.sendEmail({
      to: opts.email,
      subject: opts.subject,
      html: opts.bodyHtml ?? `<p>${opts.bodyText}</p>`,
      text: opts.bodyText,
    });
  }
}
