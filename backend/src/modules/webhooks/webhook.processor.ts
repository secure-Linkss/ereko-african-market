import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhooks')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('deliver')
  async deliverWebhook(job: Job<{ eventId: string }>) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: job.data.eventId },
      include: { endpoint: true },
    });

    if (!event || event.status === 'delivered') return;

    const body = JSON.stringify({
      id: event.id,
      type: event.eventType,
      created: Math.floor(new Date(event.createdAt).getTime() / 1000),
      data: event.payload,
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', event.endpoint.secret)
      .update(signedPayload)
      .digest('hex');

    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let status: 'delivered' | 'failed' | 'retrying' = 'failed';

    try {
      const response = await axios.post(event.endpoint.url, body, {
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

    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        status,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        responseStatus,
        responseBody,
        nextRetryAt: status === 'retrying'
          ? new Date(Date.now() + Math.pow(2, job.attemptsMade) * 5000)
          : null,
      },
    });

    if (status === 'failed' && job.attemptsMade >= 4) {
      this.logger.warn(`Webhook delivery failed permanently: eventId=${event.id} endpoint=${event.endpoint.url}`);
    }
  }
}
