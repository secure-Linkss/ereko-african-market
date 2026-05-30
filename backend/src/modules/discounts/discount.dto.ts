import {
  IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsIn,
  IsEmail, IsDateString, IsPositive, Min, Max, MinLength, MaxLength, Matches,
} from 'class-validator';

const VALID_BADGE_VALUES = ['SALE', 'HOT_DEAL', 'LIMITED', 'CLEARANCE', 'NEW_PRICE', 'SPECIAL'] as const;
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export class CreateDiscountCodeDto {
  @ApiProperty({ example: 'WELCOME20', description: 'Uppercase promo code (3-20 chars, letters/digits/hyphens)' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[A-Z0-9\-]+$/, { message: 'Code must be uppercase letters, digits, or hyphens only' })
  @Transform(({ value }) => String(value).toUpperCase().trim())
  code: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Percentage (1-99) or pence amount (e.g. 500 = £5.00)', example: 20 })
  @IsNumber()
  @IsPositive()
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order value in pence to apply code', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValueMinor?: number;

  @ApiPropertyOptional({ description: 'Max number of total uses. null = unlimited' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'ISO expiry datetime. null = never expires' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Lock code to specific customer email' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Human-readable description of this code' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}

export class ValidateDiscountDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }) => String(value).toUpperCase().trim())
  code: string;

  @ApiProperty({ description: 'Cart subtotal in pence', example: 3000 })
  @IsNumber()
  @Min(0)
  cartTotalMinor: number;

  @ApiPropertyOptional({ description: 'Customer email (used to validate customer-specific codes)' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class SetProductDiscountDto {
  @ApiProperty({ description: 'Enable or disable discount on this product' })
  @IsBoolean()
  discountEnabled: boolean;

  @ApiPropertyOptional({ description: 'Discount percentage 1-90', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Badge stamp style',
    enum: ['SALE', 'HOT_DEAL', 'LIMITED', 'CLEARANCE', 'NEW_PRICE', 'SPECIAL'],
  })
  @IsOptional()
  @IsIn(VALID_BADGE_VALUES, { message: `discountBadge must be one of: ${VALID_BADGE_VALUES.join(', ')}` })
  discountBadge?: string;
}
