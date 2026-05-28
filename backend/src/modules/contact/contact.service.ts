import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { CreateContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async submitContact(dto: CreateContactDto): Promise<{ id: string }> {
    const { data, error } = await this.supabase.db
      .from('ContactMessage')
      .insert({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        phone: dto.phone ?? null,
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to store contact message: ${error.message}`);
    }

    const adminEmail = this.config.get<string>('smtp.from') ?? 'hello@ereko.co.uk';
    try {
      await this.notifications.sendEmail({
        to: adminEmail,
        subject: `[EREKO Contact] ${dto.subject}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#E85D04">New Contact Message</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;font-weight:bold;width:100px">Name:</td><td>${dto.name}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Email:</td><td><a href="mailto:${dto.email}">${dto.email}</a></td></tr>
              ${dto.phone ? `<tr><td style="padding:8px 0;font-weight:bold">Phone:</td><td>${dto.phone}</td></tr>` : ''}
              <tr><td style="padding:8px 0;font-weight:bold">Subject:</td><td>${dto.subject}</td></tr>
            </table>
            <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
            <p style="white-space:pre-wrap">${dto.message}</p>
            <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
            <p style="color:#999;font-size:12px">Sent via ereko.co.uk contact form</p>
          </div>
        `,
        text: `New contact from ${dto.name} <${dto.email}>\n\n${dto.message}`,
        replyTo: dto.email,
      });
    } catch (err) {
      this.logger.warn(`Contact email notification failed (non-fatal): ${err.message}`);
    }

    this.logger.log(`Contact received from ${dto.email}: ${dto.subject}`);
    return { id: data?.id ?? 'unknown' };
  }

  async listContacts(limit = 50, onlyUnread = false) {
    let query = this.supabase.db
      .from('ContactMessage')
      .select('id, name, email, subject, message, phone, isRead, createdAt')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (onlyUnread) query = query.eq('isRead', false);

    const { data } = await query;
    return data ?? [];
  }

  async markAsRead(id: string): Promise<void> {
    await this.supabase.db
      .from('ContactMessage')
      .update({ isRead: true })
      .eq('id', id);
  }

  async countUnread(): Promise<number> {
    const { count } = await this.supabase.db
      .from('ContactMessage')
      .select('id', { count: 'exact', head: true })
      .eq('isRead', false);
    return count ?? 0;
  }
}
