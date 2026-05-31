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
import { SupabaseService } from '../../supabase/supabase.service';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { Public } from '../../common/decorators/public.decorator';

enum OrderStatus {
  PAID = 'PAID',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  DISPUTED = 'DISPUTED',
}

@Public()
@ApiTags('Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly supabase: SupabaseService,
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

    // Log webhook event to StripeWebhookLog
    const webhookLogId = uuidv4();
    try {
      await this.supabase.db.from('StripeWebhookLog').upsert({
        id: webhookLogId,
        stripeEventId: event.id,
        eventType: event.type,
        status: 'received',
        payload: event as any,
        receivedAt: new Date().toISOString(),
      }, { onConflict: 'stripeEventId' });
    } catch (err: any) {
      this.logger.warn(`Failed to log webhook event: ${err.message}`);
    }

    // ── V4: Idempotency — deduplicate webhook events by Stripe event ID ────────
    const { data: existingEvent } = await this.supabase.db
      .from('OrderEvent')
      .select('id')
      .eq('eventType', `stripe.${event.type}`)
      .contains('payload', { stripeEventId: event.id })
      .limit(1);

    if (existingEvent && existingEvent.length > 0) {
      this.logger.debug(`Duplicate Stripe event ${event.id} — already processed, returning cached result`);
      void this.supabase.db.from('StripeWebhookLog').update({ status: 'ignored', processedAt: new Date().toISOString() }).eq('id', webhookLogId);
      return { received: true, duplicate: true };
    }

    let processingError: string | null = null;
    try {
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
          void this.supabase.db.from('StripeWebhookLog').update({ status: 'ignored', processedAt: new Date().toISOString() }).eq('id', webhookLogId);
          return { received: true };
      }
    } catch (err) {
      processingError = err.message;
      this.logger.error(`Webhook processing error for ${event.id}: ${err.message}`);
      void this.supabase.db.from('StripeWebhookLog').update({
        status: 'failed',
        processingError: processingError,
        processedAt: new Date().toISOString(),
      }).eq('id', webhookLogId);
      throw err;
    }

    void this.supabase.db.from('StripeWebhookLog').update({ status: 'processed', processedAt: new Date().toISOString() }).eq('id', webhookLogId);

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, status, userId, totalMinor, email, orderNumber')
      .eq('stripePaymentIntentId', pi.id)
      .limit(1);

    const order = orderRows?.[0];
    if (!order) {
      this.logger.warn(`No order found for PaymentIntent ${pi.id}`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(`Order ${order.id} already marked as PAID`);
      return;
    }

    const now = new Date().toISOString();
    await this.supabase.db
      .from('Order')
      .update({ status: OrderStatus.PAID, stripePaymentStatus: pi.status, paidAt: now, updatedAt: now })
      .eq('id', order.id);

    // OrderEvent — immutable ledger entry (V4: never overwrite, always append)
    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId: order.id,
      eventType: 'stripe.payment_intent.succeeded',
      payload: { stripeEventId: pi.id, paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency },
      createdAt: now,
    });

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

    if (order.userId) {
      await this.supabase.db.from('Cart').delete().eq('userId', order.userId);
    }

    this.logger.log(`Order ${order.orderNumber} marked PAID via webhook`);
  }

  private async handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber, stripePaymentIntentId')
      .eq('stripePaymentIntentId', pi.id)
      .limit(1);

    const order = orderRows?.[0];
    if (!order) {
      this.logger.warn(`No order found for failed PaymentIntent ${pi.id}`);
      return;
    }

    const now = new Date().toISOString();
    await this.supabase.db
      .from('Order')
      .update({ stripePaymentStatus: pi.status, updatedAt: now })
      .eq('id', order.id);

    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId: order.id,
      eventType: 'stripe.payment_intent.payment_failed',
      payload: {
        stripeEventId: pi.id,
        paymentIntentId: pi.id,
        lastPaymentError: pi.last_payment_error?.message ?? null,
        declineCode: pi.last_payment_error?.decline_code ?? null,
      },
      createdAt: now,
    });

    // Release stock reservations
    const { data: items } = await this.supabase.db
      .from('OrderItem')
      .select('variantId, quantity')
      .eq('orderId', order.id);

    for (const item of items ?? []) {
      const { data: variant } = await this.supabase.db
        .from('ProductVariant')
        .select('id, stockReserved')
        .eq('id', item.variantId)
        .single();
      if (variant) {
        await this.supabase.db
          .from('ProductVariant')
          .update({ stockReserved: Math.max(0, variant.stockReserved - item.quantity), updatedAt: now })
          .eq('id', item.variantId);
      }
    }

    this.logger.warn(`Payment failed for order ${order.orderNumber}: ${pi.last_payment_error?.message}`);
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    const piId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : (dispute.payment_intent?.id ?? null);

    if (!piId) return;

    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber')
      .eq('stripePaymentIntentId', piId)
      .limit(1);

    const order = orderRows?.[0];
    if (!order) {
      this.logger.warn(`No order found for disputed charge ${dispute.id}`);
      return;
    }

    const now = new Date().toISOString();
    await this.supabase.db
      .from('Order')
      .update({ status: OrderStatus.DISPUTED, updatedAt: now })
      .eq('id', order.id);

    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId: order.id,
      eventType: 'stripe.charge.dispute.created',
      payload: {
        stripeEventId: dispute.id,
        disputeId: dispute.id,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
        paymentIntentId: piId,
      },
      createdAt: now,
    });

    this.logger.warn(`Dispute created for order ${order.orderNumber}: dispute=${dispute.id}`);
  }
}
