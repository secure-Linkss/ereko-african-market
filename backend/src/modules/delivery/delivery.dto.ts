import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsEnum, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateDeliveryFeeDto {
  @ApiProperty({ example: 'SW1A 1AA' })
  @IsString()
  @MaxLength(8, { message: 'Invalid postcode' })
  @Matches(/^[A-Z0-9 ]+$/i, { message: 'Invalid postcode format' })
  customerPostcode: string;

  @ApiPropertyOptional({ enum: ['standard', 'nextday'], default: 'standard' })
  @IsOptional()
  @IsEnum(['standard', 'nextday'])
  deliverySpeed?: 'standard' | 'nextday';
}

export class DeliveryTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  fromKm: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  toKm: number;

  @ApiProperty({ example: 99, description: 'Price in pence' })
  @IsNumber()
  @Min(0)
  priceMinor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;
}

export class UpdateDeliverySettingsDto {
  @ApiPropertyOptional({ example: 'E1 6RF' })
  @IsOptional()
  @IsString()
  storePostcode?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  maxRadiusKm?: number;

  @ApiPropertyOptional({ enum: ['tiers', 'per_km'] })
  @IsOptional()
  @IsEnum(['tiers', 'per_km'])
  pricingMode?: 'tiers' | 'per_km';

  @ApiPropertyOptional({ example: 30, description: 'Price per km in pence (per_km mode)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perKmPriceMinor?: number;

  @ApiPropertyOptional({ example: 99, description: 'Base delivery fee in pence (per_km mode)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFeePriceMinor?: number;

  @ApiPropertyOptional({ example: 200, description: 'Extra charge in pence for next-day delivery (e.g. 200 = £2.00 on top of distance fee)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nextDayPremiumMinor?: number;

  @ApiPropertyOptional({ example: 5500, description: 'Cart subtotal in pence above which delivery is free (e.g. 5500 = £55.00)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryThresholdMinor?: number;

  @ApiPropertyOptional({ type: [DeliveryTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryTierDto)
  tiers?: DeliveryTierDto[];
}
