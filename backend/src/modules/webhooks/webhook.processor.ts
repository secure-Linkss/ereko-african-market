import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhooks')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Process('deliver')
  async deliverWebhook(job: Job<{ eventId: string }>) {
    const { data: event } = await this.supabase.db
      .from('WebhookEvent')
      .select('id, endpointId, eventType, payload, status, createdAt, attempts')
      .eq('id', job.data.eventId)
      .single();

    if (!event || event.status === 'delivered') return;

    const { data: endpoint } = await this.supabase.db
      .from('WebhookEndpoint')
      .select('url, secret')
      .eq('id', event.endpointId)
      .single();

    if (!endpoint) return;

    const body = JSON.stringify({
      id: event.id,
      type: event.eventType,
      created: Math.floor(new Date(event.createdAt).getTime() / 1000),
      data: event.payload,
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(signedPayload)
      .digest('hex');

    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let status: 'delivered' | 'failed' | 'retrying' = 'failed';

    try {
      const response = await axios.post(endpoint.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'Ereko-Signature': `t=${timestamp},v1=${signature}`,
          'Ereko-Event': event.eventType,
        },
        timeout: 10000,
      });

      responseStatus = response.status;
      responseBody = JSON.stringify(response.data).substring(0, 1000);
      status = response.status >= 200 && response.status < 300 ? 'delivered' : 'failed';
    } catch (err: any) {
      responseStatus = err?.response?.status;
      responseBody = err?.message?.substring(0, 500);
      status = job.attemptsMade < 4 ? 'retrying' : 'failed';
    }

    await this.supabase.db
      .from('WebhookEvent')
      .update({
        status,
        attempts: (event.attempts ?? 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        responseStatus: responseStatus ?? null,
        responseBody: responseBody ?? null,
        nextRetryAt:
          status === 'retrying'
            ? new Date(Date.now() + Math.pow(2, job.attemptsMade) * 5000).toISOString()
            : null,
      })
      .eq('id', event.id);

    if (status === 'failed' && job.attemptsMade >= 4) {
      this.logger.warn(
        `Webhook delivery failed permanently: eventId=${event.id} endpoint=${endpoint.url}`,
      );
    }
  }
}
