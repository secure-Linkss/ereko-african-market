import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto } from './orders.dto';
import { serializeOrder } from './orders.serializer';
import { decodeCursor, encodeCursor } from '../../common/utils/pagination.util';
import { ReturnStatus } from '@prisma/client';

const ORDER_INCLUDE = {
  items: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
  },
  addresses: true,
  deliverySlotBooking: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(userId: string, limit: number, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 100);

    const cursorCondition = cursor
      ? { placedAt: { lt: new Date(decodeCursor(cursor)) } }
      : undefined;

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(cursorCondition ?? {}),
      },
      orderBy: { placedAt: 'desc' },
      take: take + 1,
      include: ORDER_INCLUDE,
    });

    let nextCursor: string | null = null;
    if (orders.length > take) {
      orders.pop();
      const last = orders[orders.length - 1];
      nextCursor = encodeCursor(last.placedAt.toISOString());
    }

    return {
      orders: orders.map(serializeOrder),
      nextCursor,
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied to this order');
    }

    return serializeOrder(order);
  }

  async createReturn(userId: string, orderId: string, dto: CreateReturnDto) {
    if (dto.orderId !== orderId) {
      throw new BadRequestException('orderId in body does not match URL parameter');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied to this order');
    }

    const returnableStatuses = [
      'DELIVERED',
      'PARTIALLY_SHIPPED',
      'SHIPPED',
    ];
    if (!returnableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order with status ${order.status} is not eligible for returns`,
      );
    }

    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));

    let refundAmountMinor = 0;

    for (const returnItem of dto.items) {
      const orderItem = orderItemMap.get(returnItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `OrderItem ${returnItem.orderItemId} does not belong to order ${orderId}`,
        );
      }
      if (returnItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity ${returnItem.quantity} exceeds ordered quantity ${orderItem.quantity} for item ${returnItem.orderItemId}`,
        );
      }
      refundAmountMinor += orderItem.priceAmountMinor * returnItem.quantity;
    }

    const timestamp = Date.now();
    const rmaNumber = `RMA-${orderId.slice(0, 8).toUpperCase()}-${timestamp}`;

    const returnRecord = await this.prisma.return.create({
      data: {
        rmaNumber,
        orderId,
        userId,
        status: ReturnStatus.PENDING_REVIEW,
        refundType: dto.refundType as any,
        refundAmountMinor,
        photoEvidenceUrls: dto.photoEvidenceUrls ?? [],
        items: {
          create: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reasonCode: item.reasonCode as any,
            customerNote: item.customerNote ?? null,
          })),
        },
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'RETURN_REQUESTED',
        payload: { rmaNumber, itemCount: dto.items.length } as any,
        actorId: userId,
      },
    });

    return {
      rmaNumber: returnRecord.rmaNumber,
      status: returnRecord.status as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED',
      refundAmountMinor: returnRecord.refundAmountMinor,
    };
  }
}
