import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateReturnDto } from './orders.dto';
import { serializeOrder } from './orders.serializer';
import { decodeCursor, encodeCursor } from '../../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async fetchOrderWithRelations(orderId: string): Promise<any | null> {
    const { data: order } = await this.supabase.db
      .from('Order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return null;

    const [{ data: items }, { data: events }, { data: addresses }, { data: slots }] =
      await Promise.all([
        this.supabase.db.from('OrderItem').select('*').eq('orderId', orderId),
        this.supabase.db.from('OrderEvent').select('*').eq('orderId', orderId).order('createdAt', { ascending: true }),
        this.supabase.db.from('OrderAddress').select('*').eq('orderId', orderId),
        this.supabase.db.from('DeliverySlotBooking').select('*').eq('orderId', orderId).limit(1),
      ]);

    return {
      ...order,
      items: items ?? [],
      events: events ?? [],
      addresses: addresses ?? [],
      deliverySlotBooking: slots?.[0] ?? null,
    };
  }

  async listOrders(userId: string, limit: number, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 100);

    let query = this.supabase.db
      .from('Order')
      .select('id, placedAt')
      .eq('userId', userId)
      .order('placedAt', { ascending: false })
      .limit(take + 1);

    if (cursor) {
      const decoded = decodeCursor(cursor);
      query = query.lt('placedAt', decoded);
    }

    const { data: orderRows } = await query;
    const rows = orderRows ?? [];

    let nextCursor: string | null = null;
    if (rows.length > take) {
      rows.pop();
      nextCursor = encodeCursor(rows[rows.length - 1].placedAt);
    }

    const orders = await Promise.all(rows.map((r: any) => this.fetchOrderWithRelations(r.id)));

    return {
      orders: orders.filter(Boolean).map(serializeOrder),
      nextCursor,
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.fetchOrderWithRelations(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied to this order');
    return serializeOrder(order);
  }

  async createReturn(userId: string, orderId: string, dto: CreateReturnDto) {
    if (dto.orderId !== orderId) {
      throw new BadRequestException('orderId in body does not match URL parameter');
    }

    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, userId, status')
      .eq('id', orderId)
      .limit(1);

    const order = orderRows?.[0];
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied to this order');

    const returnableStatuses = ['DELIVERED', 'PARTIALLY_SHIPPED', 'SHIPPED'];
    if (!returnableStatuses.includes(order.status)) {
      throw new BadRequestException(`Order with status ${order.status} is not eligible for returns`);
    }

    const { data: orderItems } = await this.supabase.db
      .from('OrderItem')
      .select('id, quantity, priceAmountMinor')
      .eq('orderId', orderId);

    const orderItemMap = new Map((orderItems ?? []).map((i: any) => [i.id, i]));
    let refundAmountMinor = 0;

    for (const returnItem of dto.items) {
      const orderItem = orderItemMap.get(returnItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(`OrderItem ${returnItem.orderItemId} does not belong to order ${orderId}`);
      }
      if (returnItem.quantity > (orderItem as any).quantity) {
        throw new BadRequestException(`Return quantity ${returnItem.quantity} exceeds ordered quantity ${(orderItem as any).quantity}`);
      }
      refundAmountMinor += (orderItem as any).priceAmountMinor * returnItem.quantity;
    }

    const rmaNumber = `RMA-${orderId.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const returnId = uuidv4();
    const now = new Date().toISOString();

    const { error: returnErr } = await this.supabase.db.from('Return').insert({
      id: returnId,
      rmaNumber,
      orderId,
      userId,
      status: 'PENDING_REVIEW',
      refundType: dto.refundType,
      refundAmountMinor,
      photoEvidenceUrls: dto.photoEvidenceUrls ?? [],
      createdAt: now,
      updatedAt: now,
    });

    if (returnErr) throw new BadRequestException(returnErr.message);

    await this.supabase.db.from('ReturnItem').insert(
      dto.items.map((item) => ({
        id: uuidv4(),
        returnId,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reasonCode: item.reasonCode,
        customerNote: item.customerNote ?? null,
        createdAt: now,
      })),
    );

    await this.supabase.db.from('OrderEvent').insert({
      id: uuidv4(),
      orderId,
      eventType: 'RETURN_REQUESTED',
      payload: { rmaNumber, itemCount: dto.items.length },
      actorId: userId,
      createdAt: now,
    });

    return { rmaNumber, status: 'PENDING_REVIEW', refundAmountMinor };
  }
}
