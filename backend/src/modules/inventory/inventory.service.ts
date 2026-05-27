import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryReasonCode } from '@prisma/client';
import { encodeCursor, decodeCursor } from '../../common/utils/pagination.util';

export class InsufficientStockException extends BadRequestException {
  constructor(variantId: string, requested: number, available: number) {
    super(
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
    );
  }
}

export interface WarehouseStockRow {
  id: string;
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adjust stock in a specific warehouse and write an audit ledger entry.
   * Negative adjustmentQty reduces onHand; validates availability first.
   */
  async adjustStock(
    warehouseId: string,
    variantId: string,
    adjustmentQty: number,
    reasonCode: InventoryReasonCode,
    actorId?: string,
    orderId?: string,
    notes?: string,
  ): Promise<void> {
    // Verify warehouse exists
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    // Verify variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Upsert WarehouseStock row
      const existing = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_variantId: { warehouseId, variantId },
        },
      });

      if (adjustmentQty < 0) {
        const currentOnHand = existing?.onHand ?? 0;
        if (currentOnHand + adjustmentQty < 0) {
          throw new InsufficientStockException(
            variantId,
            Math.abs(adjustmentQty),
            currentOnHand,
          );
        }
      }

      if (existing) {
        await tx.warehouseStock.update({
          where: { warehouseId_variantId: { warehouseId, variantId } },
          data: {
            onHand: { increment: adjustmentQty },
          },
        });
      } else {
        if (adjustmentQty < 0) {
          throw new InsufficientStockException(variantId, Math.abs(adjustmentQty), 0);
        }
        await tx.warehouseStock.create({
          data: {
            warehouseId,
            variantId,
            onHand: adjustmentQty,
            reserved: 0,
            damaged: 0,
            safetyStock: variant.safetyStockThreshold,
          },
        });
      }

      // Also keep global ProductVariant.stockOnHand in sync
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockOnHand: { increment: adjustmentQty } },
      });

      // Audit ledger
      await tx.inventoryLedger.create({
        data: {
          warehouseId,
          variantId,
          adjustmentQty,
          reasonCode,
          notes: notes ?? null,
          actorId: actorId ?? null,
          orderId: orderId ?? null,
        },
      });
    });

    this.logger.log(
      `Inventory adjusted: variant=${variantId} warehouse=${warehouseId} qty=${adjustmentQty} reason=${reasonCode}`,
    );
  }

  /**
   * Reserve stock globally (across all warehouses).
   * Increments ProductVariant.stockReserved; throws if net available < qty.
   */
  async reserveStock(variantId: string, qty: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new NotFoundException(`Variant ${variantId} not found`);
      }

      const available = variant.stockOnHand - variant.stockReserved;
      if (available < qty) {
        throw new InsufficientStockException(variantId, qty, available);
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockReserved: { increment: qty } },
      });
    });
  }

  /**
   * Release a prior reservation. Does not change onHand.
   */
  async releaseReservation(variantId: string, qty: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new NotFoundException(`Variant ${variantId} not found`);
      }

      const newReserved = Math.max(0, variant.stockReserved - qty);
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockReserved: newReserved },
      });
    });
  }

  /**
   * Return variants where (stockOnHand - stockReserved) <= safetyStockThreshold.
   */
  async getLowStockVariants(): Promise<
    Array<{ variantId: string; sku: string; available: number; safetyStock: number }>
  > {
    // Prisma cannot do column comparison in where, use raw
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sku: string;
        stock_on_hand: number;
        stock_reserved: number;
        safety_stock_threshold: number;
      }>
    >`
      SELECT id, sku, "stockOnHand" AS stock_on_hand, "stockReserved" AS stock_reserved,
             "safetyStockThreshold" AS safety_stock_threshold
      FROM "ProductVariant"
      WHERE ("stockOnHand" - "stockReserved") <= "safetyStockThreshold"
        AND "isActive" = true
    `;

    return rows.map((r) => ({
      variantId: r.id,
      sku: r.sku,
      available: Number(r.stock_on_hand) - Number(r.stock_reserved),
      safetyStock: Number(r.safety_stock_threshold),
    }));
  }

  /**
   * Count variants currently below safety stock — used by dashboard.
   */
  async countLowStock(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM "ProductVariant"
      WHERE ("stockOnHand" - "stockReserved") <= "safetyStockThreshold"
        AND "isActive" = true
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Paginated warehouse stock listing for the admin inventory page.
   */
  async getWarehouseStock(
    warehouseId?: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: WarehouseStockRow[]; nextCursor: string | null }> {
    const take = Math.min(Math.max(limit, 1), 100);
    const cursorId = cursor ? decodeCursor(cursor) : undefined;

    const rows = await this.prisma.warehouseStock.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      take: take + 1,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: {
        warehouse: { select: { name: true, code: true } },
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { title: true } },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      rows.pop();
      nextCursor = encodeCursor(rows[rows.length - 1].id);
    }

    const items: WarehouseStockRow[] = rows.map((r) => ({
      id: r.id,
      sku: r.variant.sku,
      title: r.variant.product.title,
      variantName: r.variant.name,
      warehouseName: r.warehouse.name,
      warehouseCode: r.warehouse.code,
      onHand: r.onHand,
      reserved: r.reserved,
      damaged: r.damaged,
      safetyStock: r.safetyStock,
    }));

    return { items, nextCursor };
  }
}
