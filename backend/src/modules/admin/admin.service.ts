import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { UpdateOrderStatusDto, AdjustInventoryDto, ResolveReturnDto } from './admin.dto';
import { serializeOrder } from '../orders/orders.serializer';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';
import { OrderStatus, ReturnStatus, WebhookEventStatus } from '@prisma/client';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Statuses that prevent a normal CANCELLED transition */
const POST_SHIP_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

/** Full include for Order queries used by admin */
const ORDER_INCLUDE = {
  items: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
  },
  addresses: true,
  deliverySlotBooking: true,
} as const;

// ─── STATUS TRANSITION MAP ────────────────────────────────────────────────────

/**
 * Allowed manual transitions (admin-initiated).
 * Automatic transitions (PENDING_PAYMENT → PAID) are handled by Stripe webhook.
 */
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PAID]: [
    OrderStatus.ALLOCATED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ALLOCATED]: [
    OrderStatus.PICKING,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKING]: [
    OrderStatus.PACKED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.SHIPPED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.CANCELLED, // requires privilegedOverrideReason
    OrderStatus.ON_HOLD,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.ON_HOLD,
    OrderStatus.CANCELLED, // requires privilegedOverrideReason
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.DISPUTED,
    OrderStatus.CANCELLED, // requires privilegedOverrideReason
  ],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURNED,
  ],
  [OrderStatus.RETURNED]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.ON_HOLD]: [
    OrderStatus.PAID,
    OrderStatus.ALLOCATED,
    OrderStatus.PICKING,
    OrderStatus.PACKED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.CANCELLED,
    OrderStatus.ON_HOLD,
  ],
};

// ─── SERVICE ─────────────────────────────────────────────────────────────────

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2024-06-20',
    });
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      todayOrdersCount,
      todayRevenueResult,
      lowStockItemsCount,
      pendingRefundsCount,
      activeDisputesCount,
      webhookFailuresCount,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { placedAt: { gte: todayStart } },
      }),

      this.prisma.order.aggregate({
        _sum: { totalMinor: true },
        where: {
          placedAt: { gte: todayStart },
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
          },
        },
      }),

      this.inventory.countLowStock(),

      this.prisma.return.count({
        where: { status: ReturnStatus.PENDING_REVIEW },
      }),

      this.prisma.order.count({
        where: { status: OrderStatus.DISPUTED },
      }),

      this.prisma.webhookEvent.count({
        where: { status: { in: ['failed', 'retrying'] } },
      }),
    ]);

    return {
      todayOrdersCount,
      todayRevenueMinor: todayRevenueResult._sum.totalMinor ?? 0,
      lowStockItemsCount,
      pendingRefundsCount,
      activeDisputesCount,
      webhookFailuresCount,
    };
  }

  // ─── ORDERS ────────────────────────────────────────────────────────────────

  async listOrders(
    status?: OrderStatus,
    limit = 20,
    cursor?: string,
    q?: string,
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const cursorId = cursor ? decodeCursor(cursor) : undefined;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: take + 1,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { placedAt: 'desc' },
      include: ORDER_INCLUDE,
    });

    let nextCursor: string | null = null;
    if (orders.length > take) {
      orders.pop();
      nextCursor = encodeCursor(orders[orders.length - 1].id);
    }

    return {
      orders: orders.map(serializeOrder),
      nextCursor,
    };
  }

  async updateOrderStatus(
    dto: UpdateOrderStatusDto,
    actorId: string,
    idempotencyKey: string,
  ) {
    const { orderId, status, notes, carrierName, trackingNumber, privilegedOverrideReason } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Validate status transition
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    // Privileged override check — cancelling a shipped/delivered order
    if (
      status === OrderStatus.CANCELLED &&
      POST_SHIP_STATUSES.includes(order.status) &&
      !privilegedOverrideReason
    ) {
      throw new BadRequestException(
        `Cancelling an order with status ${order.status} requires a privilegedOverrideReason`,
      );
    }

    // SHIPPED requires tracking info
    if (status === OrderStatus.SHIPPED) {
      if (!trackingNumber || !carrierName) {
        throw new BadRequestException(
          'trackingNumber and carrierName are required when setting status to SHIPPED',
        );
      }
    }

    const now = new Date();
    const updateData: Record<string, unknown> = { status };

    if (status === OrderStatus.SHIPPED) {
      updateData.trackingNumber = trackingNumber;
      updateData.carrierName = carrierName;
      updateData.shippedAt = now;
    }
    if (status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = now;
    }
    if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = now;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: ORDER_INCLUDE,
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId,
          eventType: `STATUS_CHANGED_TO_${status}`,
          actorId,
          payload: {
            from: order.status,
            to: status,
            notes: notes ?? null,
            carrierName: carrierName ?? null,
            trackingNumber: trackingNumber ?? null,
            privilegedOverrideReason: privilegedOverrideReason ?? null,
            idempotencyKey,
            timestamp: now.toISOString(),
          },
        },
      }),
    ]);

    // Emit webhook for downstream consumers
    await this.webhooks
      .dispatch('order.status_changed', {
        orderId,
        orderNumber: updated.orderNumber,
        from: order.status,
        to: status,
        trackingNumber: trackingNumber ?? null,
        carrierName: carrierName ?? null,
        timestamp: now.toISOString(),
      })
      .catch((err) =>
        this.logger.error(`Webhook dispatch failed for order ${orderId}: ${err.message}`),
      );

    return serializeOrder(updated);
  }

  // ─── INVENTORY ─────────────────────────────────────────────────────────────

  async listInventory(cursor?: string, limit = 20) {
    return this.inventory.getWarehouseStock(undefined, cursor, limit);
  }

  async adjustInventory(dto: AdjustInventoryDto, actorId: string) {
    await this.inventory.adjustStock(
      dto.warehouseId,
      dto.variantId,
      dto.adjustmentQty,
      dto.reasonCode,
      actorId,
      undefined,
      dto.notes,
    );
  }

  // ─── RETURNS ───────────────────────────────────────────────────────────────

  async listReturns() {
    const returns = await this.prisma.return.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderNumber: true, email: true } },
        items: { select: { reasonCode: true } },
      },
    });

    return returns.map((r) => ({
      id: r.id,
      orderNumber: r.order.orderNumber,
      customerEmail: r.order.email,
      status: r.status,
      reasonCode: r.items[0]?.reasonCode ?? null,
      refundAmountMinor: r.refundAmountMinor,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async resolveReturn(
    dto: ResolveReturnDto,
    actorId: string,
    idempotencyKey: string,
  ) {
    const { rmaId, action, reason, customRefundAmountMinor } = dto;

    const rma = await this.prisma.return.findUnique({
      where: { id: rmaId },
      include: { order: true },
    });
    if (!rma) {
      throw new NotFoundException(`Return ${rmaId} not found`);
    }

    if (rma.status !== ReturnStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Return ${rmaId} has already been resolved (status=${rma.status})`,
      );
    }

    const now = new Date();
    const newStatus =
      action === 'approve' ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;

    if (action === 'approve') {
      const refundAmount =
        customRefundAmountMinor !== undefined
          ? customRefundAmountMinor
          : rma.refundAmountMinor;

      if (refundAmount > 0 && rma.order.stripePaymentIntentId) {
        // Retrieve payment intent to get the charge ID
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          rma.order.stripePaymentIntentId,
        );

        const chargeId =
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (chargeId) {
          await this.stripe.refunds.create({
            charge: chargeId,
            amount: refundAmount,
            metadata: {
              rmaId,
              orderId: rma.orderId,
              actorId,
              idempotencyKey,
            },
          });

          this.logger.log(
            `Stripe refund created: rmaId=${rmaId} amount=${refundAmount} charge=${chargeId}`,
          );
        } else {
          this.logger.warn(
            `No charge found on payment intent ${rma.order.stripePaymentIntentId} for rmaId=${rmaId}`,
          );
        }
      }

      await this.prisma.$transaction([
        this.prisma.return.update({
          where: { id: rmaId },
          data: {
            status: newStatus,
            resolvedAt: now,
            resolvedBy: actorId,
            resolveReason: reason ?? null,
            customRefundMinor:
              customRefundAmountMinor !== undefined ? customRefundAmountMinor : null,
          },
        }),
        this.prisma.order.update({
          where: { id: rma.orderId },
          data: { status: OrderStatus.REFUNDED },
        }),
        this.prisma.orderEvent.create({
          data: {
            orderId: rma.orderId,
            eventType: 'RETURN_APPROVED',
            actorId,
            payload: {
              rmaId,
              refundAmountMinor: customRefundAmountMinor ?? rma.refundAmountMinor,
              reason: reason ?? null,
              idempotencyKey,
              timestamp: now.toISOString(),
            },
          },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.return.update({
          where: { id: rmaId },
          data: {
            status: newStatus,
            resolvedAt: now,
            resolvedBy: actorId,
            resolveReason: reason ?? null,
          },
        }),
        this.prisma.orderEvent.create({
          data: {
            orderId: rma.orderId,
            eventType: 'RETURN_REJECTED',
            actorId,
            payload: {
              rmaId,
              reason: reason ?? null,
              idempotencyKey,
              timestamp: now.toISOString(),
            },
          },
        }),
      ]);
    }

    this.logger.log(
      `Return ${rmaId} ${action}d by admin ${actorId}`,
    );
  }
}
