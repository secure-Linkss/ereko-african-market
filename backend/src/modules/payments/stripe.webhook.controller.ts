import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import Stripe from 'stripe';

@ApiTags('Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() @InjectQueue('orders') private readonly ordersQueue: Queue | null,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.config.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook not configured');
    }

    // NestJS rawBody: true option stores the raw buffer on req
    const rawBody = req.body as Buffer;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Raw body unavailable — ensure route receives raw body');
    }

    let event: Stripe.Event;
    try {
      event = this.paymentsService.constructWebhookEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature invalid: ${err.message}`);
    }

    this.logger.log(`Stripe event received: ${event.type} id=${event.id}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  private async handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
    });

    if (!order) {
      this.logger.warn(`No order found for PaymentIntent ${pi.id}`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(`Order ${order.id} already marked as PAID`);
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        stripePaymentStatus: pi.status,
        paidAt: new Date(),
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        eventType: 'payment.succeeded',
        payload: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        },
      },
    });

    // Enqueue order.placed job → triggers loyalty award + email notification
    if (this.ordersQueue) {
      await this.ordersQueue.add(
        'order.placed',
        {
          orderId: order.id,
          userId: order.userId,
          totalMinor: order.totalMinor,
          email: order.email,
          orderNumber: order.orderNumber,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, jobId: `order.placed:${order.id}` },
      );
    } else {
      this.logger.warn(`Queue unavailable — post-processing for order ${order.orderNumber} skipped`);
    }

    // Clear the user's cart
    if (order.userId) {
      await this.prisma.cart.deleteMany({ where: { userId: order.userId } });
    }

    this.logger.log(`Order ${order.orderNumber} marked PAID via webhook`);
  }

  private async handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
    });

    if (!order) {
      this.logger.warn(`No order found for failed PaymentIntent ${pi.id}`);
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        stripePaymentStatus: pi.status,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        eventType: 'payment.failed',
        payload: {
          paymentIntentId: pi.id,
          lastPaymentError: pi.last_payment_error?.message ?? null,
          declineCode: pi.last_payment_error?.decline_code ?? null,
        },
      },
    });

    // Release stock reservation
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    if (orderWithItems) {
      await this.prisma.$transaction(
        orderWithItems.items.map((item) =>
          this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockReserved: { decrement: item.quantity } },
          }),
        ),
      );
    }

    this.logger.warn(`Payment failed for order ${order.orderNumber}: ${pi.last_payment_error?.message}`);
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: dispute.payment_intent as string },
    });

    if (!order) {
      this.logger.warn(`No order found for disputed charge ${dispute.id}`);
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.DISPUTED },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        eventType: 'dispute.created',
        payload: {
          disputeId: dispute.id,
          amount: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
          paymentIntentId: typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : (dispute.payment_intent?.id ?? null),
        },
      },
    });

    this.logger.warn(`Dispute created for order ${order.orderNumber}: dispute=${dispute.id}`);
  }
}
