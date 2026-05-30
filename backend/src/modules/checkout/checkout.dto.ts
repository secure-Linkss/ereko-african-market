import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
enum DeliveryMethod { standard = 'standard', express = 'express', click_and_collect = 'click_and_collect', same_day = 'same_day' }

export enum PaymentMethodEnum {
  card = 'card',
  apple_pay = 'apple_pay',
  google_pay = 'google_pay',
  klarna = 'klarna',
  clearpay = 'clearpay',
}

export class AddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postcode: string;

  @ApiPropertyOptional({ default: 'GB' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class DeliverySlotInputDto {
  @ApiProperty({ example: '2024-12-25' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  slotStart: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @IsNotEmpty()
  slotEnd: string;
}

export class StartCheckoutDto {
  @ApiProperty({ description: 'Delivery postcode for slot availability check' })
  @IsString()
  @IsNotEmpty()
  postcode: string;

  @ApiProperty({ description: 'Cart ID to check out' })
  @IsUUID()
  cartId: string;

  @ApiProperty({ description: 'Customer email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Discount/promo code to apply at checkout' })
  @IsOptional()
  @IsString()
  discountCode?: string;
}

export class PaymentIntentDto {
  @ApiProperty({ description: 'Order ID returned from /checkout/start' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethodEnum, description: 'Chosen payment method' })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;
}

export class ConfirmOrderDto {
  @ApiProperty({ description: 'Order ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Stripe PaymentIntent ID' })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @ApiProperty({ description: 'Whether billing address matches shipping address' })
  @IsBoolean()
  billingAddressSameAsShipping: boolean;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({ type: DeliverySlotInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliverySlotInputDto)
  deliverySlot?: DeliverySlotInputDto;

  @ApiProperty({ enum: DeliveryMethod })
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;
}

export class ConfirmInStoreOrderDto {
  @ApiProperty({ description: 'Order ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiPropertyOptional({ description: 'Customer note' })
  @IsOptional()
  @IsString()
  notes?: string;
}
