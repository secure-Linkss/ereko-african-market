import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsPositive,
  IsNotEmpty,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemInputDto {
  @ApiProperty({ description: 'Product variant ID' })
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Client-side price hint (pence) — server always uses DB price for security' })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceMinor?: number;
}

export class SyncCartDto {
  @ApiPropertyOptional({ description: 'Cart ID (for existing carts)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Cart items to sync', type: [CartItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items: CartItemInputDto[];

  @ApiPropertyOptional({ description: 'Applied promo code' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Loyalty points to redeem' })
  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPointsRedeemed?: number;
}

export class ApplyCouponDto {
  @ApiProperty({ description: 'Promo code string' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class RedeemLoyaltyDto {
  @ApiProperty({ description: 'Number of loyalty points to redeem' })
  @IsInt()
  @IsPositive()
  points: number;
}
