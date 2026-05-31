import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsUUID } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { StockNotificationsService } from './stock-notifications.service';

class SubscribeStockDto {
  @IsEmail()
  email: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;
}

@ApiTags('Stock Notifications')
@Controller('stock-notifications')
export class StockNotificationsController {
  constructor(private readonly service: StockNotificationsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to back-in-stock notification for a product' })
  async subscribe(@Body() body: SubscribeStockDto) {
    await this.service.subscribe(body.email, body.productId, body.variantId);
    // Always return same message regardless of subscription state — prevents email enumeration
    return {
      ok: true,
      message: "We'll email you when this is back in stock.",
    };
  }
}
