import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PaymentsModule } from '../payments/payments.module';
import { DiscountModule } from '../discounts/discount.module';

const hasRedis = !!(process.env.REDIS_URL || process.env.REDIS_HOST);

@Module({
  imports: [
    PaymentsModule,
    DiscountModule,
    ...(hasRedis ? [BullModule.registerQueue({ name: 'orders' })] : []),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
