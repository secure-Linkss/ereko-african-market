import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe.webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersProcessor } from './orders.processor';
import { NotificationsModule } from '../notifications/notifications.module';

const hasRedis = !!(process.env.REDIS_URL || process.env.REDIS_HOST);

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ...(hasRedis ? [BullModule.registerQueue({ name: 'orders' })] : []),
  ],
  controllers: [StripeWebhookController],
  providers: [PaymentsService, OrdersProcessor],
  exports: [PaymentsService],
})
export class PaymentsModule {}
