import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { OrderStatus, InventoryReasonCode } from '@prisma/client';

// ─── ORDER STATUS ────────────────────────────────────────────────────────────

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'Order ID being updated' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: OrderStatus, description: 'New target status' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Admin notes for the status change' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Carrier name (required when status=SHIPPED)' })
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional({ description: 'Tracking number (required when status=SHIPPED)' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description:
      'Required when cancelling an order that is already SHIPPED or DELIVERED',
  })
  @IsOptional()
  @IsString()
  privilegedOverrideReason?: string;
}

// ─── INVENTORY ADJUSTMENT ────────────────────────────────────────────────────

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Warehouse ID to adjust stock in' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Product variant ID' })
  @IsString()
  variantId: string;

  @ApiProperty({
    description: 'Adjustment quantity — positive to add, negative to remove',
  })
  @IsInt()
  adjustmentQty: number;

  @ApiProperty({
    enum: InventoryReasonCode,
    description: 'Reason code for the ledger entry',
  })
  @IsEnum(InventoryReasonCode)
  reasonCode: InventoryReasonCode;

  @ApiPropertyOptional({ description: 'Optional free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── RESOLVE RETURN ──────────────────────────────────────────────────────────

export class ResolveReturnDto {
  @ApiProperty({ description: 'Return (RMA) ID' })
  @IsString()
  rmaId: string;

  @ApiProperty({ enum: ['approve', 'reject'], description: 'Resolution action' })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Reason for rejection or approval notes' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Override refund amount in pence — defaults to Return.refundAmountMinor when absent',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  customRefundAmountMinor?: number;
}
