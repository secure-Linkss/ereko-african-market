import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

export interface RefundLineItem {
  orderItemId: string;
  quantity: number;
}

export interface CreateRefundDto {
  orderId: string;
  items?: RefundLineItem[];
  refundDelivery?: boolean;
  customAmountMinor?: number;
  reason: string;
  notes?: string;
}

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2024-06-20',
    });
  }

  private get frontendUrl(): string {
    return this.config.get<string>('frontend.url') ?? 'https://ereko-african-market.vercel.app/en-gb';
  }

  async getOrderRefundSummary(orderId: string) {
    const { data: order } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber, status, totalMinor, shippingMinor, stripePaymentIntentId, email, userId')
      .eq('id', orderId)
      .single();

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const [{ data: items }, { data: existingRefunds }] = await Promise.all([
      this.supabase.db.from('OrderItem').select('*').eq('orderId', orderId),
      this.supabase.db.from('OrderRefund').select('*').eq('orderId', orderId).order('createdAt', { ascending: false }),
    ]);

    const totalRefundedMinor = (existingRefunds ?? []).reduce((sum: number, r: any) => sum + r.amountMinor, 0);
    const maxRefundableMinor = order.totalMinor - totalRefundedMinor;

    return {
      order,
      items: items ?? [],
      existingRefunds: existingRefunds ?? [],
      totalRefundedMinor,
      maxRefundableMinor,
    };
  }

  async processRefund(dto: CreateRefundDto, actorId: string): Promise<any> {
    const summary = await this.getOrderRefundSummary(dto.orderId);
    const { order, items } = summary;

    if (!order.stripePaymentIntentId) {
      throw new BadRequestException('Order has no Stripe payment — cannot process refund');
    }

    // Calculate refund amount
    let amountMinor = 0;

    if (dto.customAmountMinor !== undefined && dto.customAmountMinor > 0) {
      amountMinor = dto.customAmountMinor;
    } else {
      if (dto.items?.length) {
        const itemMap = new Map(items.map((i: any) => [i.id, i]));
        for (const refundItem of dto.items) {
          const orderItem = itemMap.get(refundItem.orderItemId);
          if (!orderItem) throw new BadRequestException(`Order item ${refundItem.orderItemId} not found`);
          if (refundItem.quantity > orderItem.quantity) {
            throw new BadRequestException(`Cannot refund more than purchased quantity for ${orderItem.title}`);
          }
          amountMinor += orderItem.priceAmountMinor * refundItem.quantity;
        }
      }

      if (dto.refundDelivery && order.shippingMinor > 0) {
        amountMinor += order.shippingMinor;
      }
    }

    if (amountMinor <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (amountMinor > summary.maxRefundableMinor) {
      throw new BadRequestException(
        `Refund amount £${(amountMinor / 100).toFixed(2)} exceeds maximum refundable amount £${(summary.maxRefundableMinor / 100).toFixed(2)}`,
      );
    }

    // Retrieve Stripe PaymentIntent to get charge ID
    const pi = await this.stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;

    if (!chargeId) {
      throw new BadRequestException('No charge found on this payment intent — payment may not have been captured');
    }

    // Create Stripe refund (idempotent via metadata)
    let stripeRefundId: string | null = null;
    try {
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amountMinor,
        metadata: {
          orderId: dto.orderId,
          actorId,
          reason: dto.reason.slice(0, 50),
        },
      });
      stripeRefundId = refund.id;
      this.logger.log(`Stripe refund created: ${refund.id} amount=${amountMinor} order=${order.orderNumber}`);
    } catch (err) {
      this.logger.error(`Stripe refund failed: ${err.message}`);
      throw new BadRequestException(`Stripe refund failed: ${err.message}`);
    }

    const now = new Date().toISOString();
    const refundId = uuidv4();

    // Save refund record
    await this.supabase.db.from('OrderRefund').insert({
      id: refundId,
      orderId: dto.orderId,
      stripeRefundId,
      amountMinor,
      reason: dto.reason,
      notes: dto.notes ?? null,
      processedBy: actorId,
      refundEmailSent: false,
      createdAt: now,
    });

    // Update order status
    const newTotalRefunded = summary.totalRefundedMinor + amountMinor;
    const isFullRefund = newTotalRefunded >= order.totalMinor;
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.supabase.db.from('Order').update({
      status: newStatus,
      updatedAt: now,
    }).eq('id', dto.orderId);

    // Append event to order event log
    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId: dto.orderId,
      eventType: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      actorId,
      payload: {
        refundId,
        stripeRefundId,
        amountMinor,
        reason: dto.reason,
        notes: dto.notes ?? null,
        isFullRefund,
        timestamp: now,
      },
      createdAt: now,
    });

    // Send refund email to customer
    let customerName = 'Customer';
    if (order.userId) {
      const { data: user } = await this.supabase.db
        .from('User').select('firstName, lastName').eq('id', order.userId).single();
      customerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Customer';
    }

    await this.notifications.sendRefundConfirmation({
      email: order.email,
      firstName: customerName,
      orderNumber: order.orderNumber,
      refundAmountFormatted: `£${(amountMinor / 100).toFixed(2)}`,
      reason: dto.reason,
      supportEmail: 'hello@ereko.market',
      orderUrl: `${this.frontendUrl}/account`,
    }).catch((err) => this.logger.error(`Refund email failed: ${err.message}`));

    void this.supabase.db.from('OrderRefund').update({ refundEmailSent: true }).eq('id', refundId);

    this.logger.log(`Refund processed: ${refundId} amount=${amountMinor} order=${order.orderNumber} by=${actorId}`);

    return {
      refundId,
      stripeRefundId,
      amountMinor,
      amountFormatted: `£${(amountMinor / 100).toFixed(2)}`,
      newOrderStatus: newStatus,
      isFullRefund,
    };
  }

  async listRefundsForOrder(orderId: string) {
    const { data } = await this.supabase.db
      .from('OrderRefund')
      .select('*')
      .eq('orderId', orderId)
      .order('createdAt', { ascending: false });
    return data ?? [];
  }
}
