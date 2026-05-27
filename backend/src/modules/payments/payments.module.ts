import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe.webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersProcessor } from './orders.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'orders' }),
  ],
  controllers: [StripeWebhookController],
  providers: [PaymentsService, OrdersProcessor],
  exports: [PaymentsService],
})
export class PaymentsModule {}
