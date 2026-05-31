import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePaymentIntentOptions {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  customerId?: string;
  paymentMethodId?: string;
  idempotencyKey?: string; // V4: client-provided idempotency key to prevent duplicate charges
}

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const secretKey = this.config.get<string>('stripe.secretKey');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe calls will fail');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }

  get stripeClient(): Stripe {
    return this.stripe;
  }

  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: options.amount,
      currency: options.currency,
      metadata: options.metadata ?? {},
      payment_method_types:
        options.paymentMethodTypes && options.paymentMethodTypes.length > 0
          ? options.paymentMethodTypes
          : ['card'],
      capture_method: 'automatic',
    };

    if (options.customerId) {
      params.customer = options.customerId;
    }

    if (options.paymentMethodId) {
      params.payment_method = options.paymentMethodId;
    }

    // V4: Pass idempotency key to Stripe to prevent duplicate charges on retries
    const idempotencyKey = options.idempotencyKey ?? `pi-${options.metadata?.orderId ?? uuidv4()}`;
    const paymentIntent = await this.stripe.paymentIntents.create(params, {
      idempotencyKey,
    });
    this.logger.log(`PaymentIntent created: ${paymentIntent.id} amount=${paymentIntent.amount} idempotencyKey=${idempotencyKey}`);
    return paymentIntent;
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err) {
      this.logger.warn(`Failed to retrieve PaymentIntent ${paymentIntentId}: ${err.message}`);
      return null;
    }
  }

  async refundPaymentIntent(
    paymentIntentId: string,
    amountMinor?: number,
    reason?: Stripe.RefundCreateParams.Reason,
  ): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amountMinor != null) {
      params.amount = amountMinor;
    }

    if (reason) {
      params.reason = reason;
    }

    const refund = await this.stripe.refunds.create(params);
    this.logger.log(`Refund created: ${refund.id} for PaymentIntent ${paymentIntentId}`);
    return refund;
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  async createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Customer> {
    return this.stripe.customers.create(params);
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }
}
