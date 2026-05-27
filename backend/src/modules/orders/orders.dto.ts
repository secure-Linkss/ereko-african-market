import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReturnReasonCodeDto {
  damaged = 'damaged',
  wrong_item = 'wrong_item',
  quality_issue = 'quality_issue',
  missing_item = 'missing_item',
  changed_mind = 'changed_mind',
}

export enum RefundTypeDto {
  original_card = 'original_card',
  store_credit = 'store_credit',
  loyalty_points = 'loyalty_points',
}

export class ReturnItemDto {
  @ApiProperty({ description: 'OrderItem ID to return' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ description: 'Quantity being returned', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: ReturnReasonCodeDto })
  @IsEnum(ReturnReasonCodeDto)
  reasonCode: ReturnReasonCodeDto;

  @ApiPropertyOptional({ description: 'Customer-provided note about the return' })
  @IsOptional()
  @IsString()
  customerNote?: string;
}

export class CreateReturnDto {
  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'URLs of photo evidence' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoEvidenceUrls?: string[];

  @ApiProperty({ enum: RefundTypeDto })
  @IsEnum(RefundTypeDto)
  refundType: RefundTypeDto;

  @ApiProperty({ description: 'Order ID (redundant but required by frontend contract)' })
  @IsString()
  orderId: string;
}
