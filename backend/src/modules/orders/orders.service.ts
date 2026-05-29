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

  async getPublicTracking(orderNumber: string, email: string) {
    const { data: orderRows } = await this.supabase.db
      .from('Order')
      .select('id, orderNumber, status, deliveryMethod, trackingNumber, carrierName, placedAt, shippedAt, deliveredAt, email, totalMinor')
      .eq('orderNumber', orderNumber)
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    const order = orderRows?.[0];
    if (!order) throw new NotFoundException('Order not found — check your order number and email address.');

    const { data: events } = await this.supabase.db
      .from('OrderEvent')
      .select('eventType, payload, createdAt')
      .eq('orderId', order.id)
      .order('createdAt', { ascending: true });

    const { data: items } = await this.supabase.db
      .from('OrderItem')
      .select('title, quantity, variantName')
      .eq('orderId', order.id);

    return buildTrackingResponse(order, events ?? [], items ?? []);
  }

  async getOrderTracking(userId: string, orderId: string) {
    const order = await this.fetchOrderWithRelations(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied to this order');
    return buildTrackingResponse(order, order.events ?? [], order.items ?? []);
  }
}

const DELIVERY_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Order Placed', icon: 'receipt', desc: 'We have received your order.' },
  { key: 'PAID', label: 'Payment Confirmed', icon: 'credit-card', desc: 'Payment has been confirmed.' },
  { key: 'ALLOCATED', label: 'Processing', icon: 'box', desc: 'Your order is being processed.' },
  { key: 'PICKING', label: 'Picking Items', icon: 'package', desc: 'Our team is picking your items.' },
  { key: 'PACKED', label: 'Packed & Ready', icon: 'package-check', desc: 'Your order is packed and ready.' },
  { key: 'SHIPPED', label: 'Shipped', icon: 'truck', desc: 'Your order is on its way.' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'map-pin', desc: 'Your order is out for delivery today.' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check-circle', desc: 'Your order has been delivered.' },
];

const COLLECTION_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Order Placed', icon: 'receipt', desc: 'We have received your order.' },
  { key: 'PAID', label: 'Payment Confirmed', icon: 'credit-card', desc: 'Payment has been confirmed.' },
  { key: 'ALLOCATED', label: 'Preparing Your Order', icon: 'box', desc: 'We are preparing your order in-store.' },
  { key: 'PICKING', label: 'Picking Items', icon: 'package', desc: 'Staff are picking and packing your items.' },
  { key: 'PACKED', label: 'Ready for Collection', icon: 'store', desc: 'Your order is ready. Come pick it up at 5 Broadway, Barking, IG11 7LS.' },
  { key: 'DELIVERED', label: 'Collected', icon: 'check-circle', desc: 'Order collected. Enjoy your EREKO products!' },
];

const STATUS_ORDER = ['PENDING_PAYMENT','PAID','ALLOCATED','PICKING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','ON_HOLD','RETURN_REQUESTED'];

function buildTrackingResponse(order: any, events: any[], items: any[]) {
  const isCollection = order.deliveryMethod === 'click_and_collect';
  const steps = isCollection ? COLLECTION_STEPS : DELIVERY_STEPS;

  const statusIdx = STATUS_ORDER.indexOf(order.status);
  const stepsWithStatus = steps.map((step) => {
    const stepIdx = STATUS_ORDER.indexOf(step.key);
    let state: 'completed' | 'active' | 'pending' = 'pending';
    if (stepIdx < statusIdx) state = 'completed';
    else if (stepIdx === statusIdx) state = 'active';
    // For collection flow: PAID/SHIPPED/OUT_FOR_DELIVERY map to 'completed' once PACKED
    if (isCollection && order.status === 'PACKED' && ['PAID','ALLOCATED','PICKING'].includes(step.key)) state = 'completed';
    if (isCollection && order.status === 'DELIVERED' && step.key !== 'DELIVERED') state = 'completed';
    return { ...step, state };
  });

  const timeline = events.map((e: any) => ({
    eventType: e.eventType,
    timestamp: e.createdAt,
    note: (e.payload as any)?.notes ?? null,
  }));

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    isClickAndCollect: isCollection,
    trackingNumber: order.trackingNumber ?? null,
    carrierName: order.carrierName ?? null,
    placedAt: order.placedAt,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    totalMinor: order.totalMinor,
    items: items.map((i: any) => ({ title: i.title, variantName: i.variantName, quantity: i.quantity })),
    steps: stepsWithStatus,
    timeline,
    collectionAddress: isCollection ? '5 Broadway, Barking, IG11 7LS' : null,
    collectionHours: isCollection ? 'Mon–Sat 9am–7pm, Sun 10am–5pm' : null,
  };
}
