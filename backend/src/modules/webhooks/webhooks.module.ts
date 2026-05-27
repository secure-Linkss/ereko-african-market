import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhookProcessor } from './webhook.processor';
import { PrismaModule } from '../../prisma/prisma.module';

const hasRedis = !!(process.env.REDIS_URL || process.env.REDIS_HOST);

@Module({
  imports: [
    PrismaModule,
    ...(hasRedis ? [BullModule.registerQueue({ name: 'webhooks' })] : []),
  ],
  providers: [WebhooksService, WebhookProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
