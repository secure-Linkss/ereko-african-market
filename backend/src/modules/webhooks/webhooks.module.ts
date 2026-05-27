import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhookProcessor } from './webhook.processor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'webhooks' }),
    PrismaModule,
  ],
  providers: [WebhooksService, WebhookProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
