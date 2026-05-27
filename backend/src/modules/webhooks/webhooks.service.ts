import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
  ) {}

  async dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        events: { has: eventType },
      },
    });

    for (const endpoint of endpoints) {
      const event = await this.prisma.webhookEvent.create({
        data: {
          endpointId: endpoint.id,
          eventType,
          payload: payload as any,
          status: 'pending',
        },
      });

      await this.webhooksQueue.add('deliver', { eventId: event.id }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      });
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
