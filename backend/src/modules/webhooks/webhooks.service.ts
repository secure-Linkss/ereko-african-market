import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Optional() @InjectQueue('webhooks') private readonly webhooksQueue: Queue | null,
  ) {}

  async dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const { data: endpoints } = await this.supabase.db
      .from('WebhookEndpoint')
      .select('id, url, secret, events')
      .eq('isActive', true)
      .contains('events', [eventType]);

    for (const endpoint of endpoints ?? []) {
      const now = new Date().toISOString();
      const { data: event } = await this.supabase.db
        .from('WebhookEvent')
        .insert({
          id: uuidv4(),
          endpointId: endpoint.id,
          eventType,
          payload,
          status: 'pending',
          attempts: 0,
          createdAt: now,
        })
        .select('id')
        .single();

      if (!event) continue;

      if (this.webhooksQueue) {
        await this.webhooksQueue.add('deliver', { eventId: event.id }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
        });
      } else {
        this.logger.warn(`Webhook queue unavailable — event ${event.id} stored but not dispatched`);
      }
    }
  }

  generateSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }
}
