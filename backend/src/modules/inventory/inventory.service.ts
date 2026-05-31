import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../../supabase/supabase.service';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';
import { v4 as uuidv4 } from 'uuid';

export enum InventoryReasonCode {
  receipt = 'receipt',
  sale = 'sale',
  return = 'return',
  transfer_in = 'transfer_in',
  transfer_out = 'transfer_out',
  adjustment = 'adjustment',
}

export class InsufficientStockException extends BadRequestException {
  constructor(variantId: string, requested: number, available: number) {
    super(
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
    );
  }
}

export interface WarehouseStockRow {
  id: string;
  warehouseId: string;
  variantId: string;
  sku: string;
  title: string;
  variantName: string;
  warehouseName: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  damaged: number;
  safetyStock: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async adjustStock(
    warehouseId: string,
    variantId: string,
    adjustmentQty: number,
    reasonCode: InventoryReasonCode,
    actorId?: string,
    orderId?: string,
    notes?: string,
  ): Promise<void> {
    const { data: warehouse } = await this.supabase.db
      .from('Warehouse')
      .select('id')
      .eq('id', warehouseId)
      .single();
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

    const { data: variant } = await this.supabase.db
      .from('ProductVariant')
      .select('id, productId, stockOnHand, safetyStockThreshold')
      .eq('id', variantId)
      .single();
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    const { data: existing } = await this.supabase.db
      .from('WarehouseStock')
      .select('id, onHand')
      .eq('warehouseId', warehouseId)
      .eq('variantId', variantId)
      .single();

    const now = new Date().toISOString();

    if (adjustmentQty < 0) {
      const currentOnHand = existing?.onHand ?? 0;
      if (currentOnHand + adjustmentQty < 0) {
        throw new InsufficientStockException(variantId, Math.abs(adjustmentQty), currentOnHand);
      }
    }

    if (existing) {
      await this.supabase.db
        .from('WarehouseStock')
        .update({ onHand: existing.onHand + adjustmentQty, updatedAt: now })
        .eq('id', existing.id);
    } else {
      if (adjustmentQty < 0) {
        throw new InsufficientStockException(variantId, Math.abs(adjustmentQty), 0);
      }
      await this.supabase.db.from('WarehouseStock').insert({
        id: uuidv4(),
        warehouseId,
        variantId,
        onHand: adjustmentQty,
        reserved: 0,
        damaged: 0,
        safetyStock: variant.safetyStockThreshold,
        updatedAt: now,
      });
    }

    const prevStockOnHand = variant.stockOnHand;
    await this.supabase.db
      .from('ProductVariant')
      .update({ stockOnHand: variant.stockOnHand + adjustmentQty, updatedAt: now })
      .eq('id', variantId);

    // Emit back-in-stock event when stock transitions from 0 to positive
    if (prevStockOnHand === 0 && adjustmentQty > 0) {
      this.eventEmitter.emit('stock.restocked', { variantId, productId: variant.productId });
    }

    // InventoryLedger has NO updatedAt column
    await this.supabase.db.from('InventoryLedger').insert({
      id: uuidv4(),
      warehouseId,
      variantId,
      adjustmentQty,
      reasonCode,
      notes: notes ?? null,
      actorId: actorId ?? null,
      orderId: orderId ?? null,
      createdAt: now,
    });

    this.logger.log(
      `Inventory adjusted: variant=${variantId} warehouse=${warehouseId} qty=${adjustmentQty} reason=${reasonCode}`,
    );
  }

  async reserveStock(variantId: string, qty: number): Promise<void> {
    const { data: variant } = await this.supabase.db
      .from('ProductVariant')
      .select('id, stockOnHand, stockReserved')
      .eq('id', variantId)
      .single();
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    const available = variant.stockOnHand - variant.stockReserved;
    if (available < qty) {
      throw new InsufficientStockException(variantId, qty, available);
    }

    await this.supabase.db
      .from('ProductVariant')
      .update({ stockReserved: variant.stockReserved + qty, updatedAt: new Date().toISOString() })
      .eq('id', variantId);
  }

  async releaseReservation(variantId: string, qty: number): Promise<void> {
    const { data: variant } = await this.supabase.db
      .from('ProductVariant')
      .select('id, stockReserved')
      .eq('id', variantId)
      .single();
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

    const newReserved = Math.max(0, variant.stockReserved - qty);
    await this.supabase.db
      .from('ProductVariant')
      .update({ stockReserved: newReserved, updatedAt: new Date().toISOString() })
      .eq('id', variantId);
  }

  async getLowStockVariants(): Promise<
    Array<{ variantId: string; sku: string; available: number; safetyStock: number }>
  > {
    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('id, sku, stockOnHand, stockReserved, safetyStockThreshold')
      .eq('isActive', true);

    return (variants ?? [])
      .filter((v: any) => v.stockOnHand - v.stockReserved <= v.safetyStockThreshold)
      .map((v: any) => ({
        variantId: v.id,
        sku: v.sku,
        available: v.stockOnHand - v.stockReserved,
        safetyStock: v.safetyStockThreshold,
      }));
  }

  async countLowStock(): Promise<number> {
    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('id, stockOnHand, stockReserved, safetyStockThreshold')
      .eq('isActive', true);

    return (variants ?? []).filter(
      (v: any) => v.stockOnHand - v.stockReserved <= v.safetyStockThreshold,
    ).length;
  }

  async getWarehouseStock(
    warehouseId?: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: WarehouseStockRow[]; nextCursor: string | null }> {
    const take = Math.min(Math.max(limit, 1), 100);

    let query = this.supabase.db
      .from('WarehouseStock')
      .select('id, warehouseId, variantId, onHand, reserved, damaged, safetyStock, updatedAt')
      .order('updatedAt', { ascending: false })
      .limit(take + 1);

    if (warehouseId) query = query.eq('warehouseId', warehouseId);
    if (cursor) {
      const decoded = decodeCursor(cursor);
      query = query.lt('updatedAt', decoded);
    }

    const { data: rows } = await query;
    const allRows = rows ?? [];

    let nextCursor: string | null = null;
    if (allRows.length > take) {
      allRows.pop();
      nextCursor = encodeCursor(allRows[allRows.length - 1].updatedAt);
    }

    if (!allRows.length) return { items: [], nextCursor: null };

    const warehouseIds = [...new Set(allRows.map((r: any) => r.warehouseId))];
    const variantIds = [...new Set(allRows.map((r: any) => r.variantId))];

    const [{ data: warehouses }, { data: variants }] = await Promise.all([
      this.supabase.db.from('Warehouse').select('id, name, code').in('id', warehouseIds),
      this.supabase.db
        .from('ProductVariant')
        .select('id, sku, name, productId')
        .in('id', variantIds),
    ]);

    const productIds = [...new Set((variants ?? []).map((v: any) => v.productId))];
    const { data: products } = await this.supabase.db
      .from('Product')
      .select('id, title')
      .in('id', productIds);

    const warehouseMap = new Map((warehouses ?? []).map((w: any) => [w.id, w]));
    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    const items: WarehouseStockRow[] = allRows.map((r: any) => {
      const w = warehouseMap.get(r.warehouseId) ?? { name: '', code: '' };
      const v = variantMap.get(r.variantId) ?? { sku: '', name: '', productId: '' };
      const p = productMap.get((v as any).productId) ?? { title: '' };
      return {
        id: r.id,
        warehouseId: r.warehouseId,
        variantId: r.variantId,
        sku: (v as any).sku,
        title: (p as any).title,
        variantName: (v as any).name,
        warehouseName: (w as any).name,
        warehouseCode: (w as any).code,
        onHand: r.onHand,
        reserved: r.reserved,
        damaged: r.damaged,
        safetyStock: r.safetyStock,
      };
    });

    return { items, nextCursor };
  }
}
