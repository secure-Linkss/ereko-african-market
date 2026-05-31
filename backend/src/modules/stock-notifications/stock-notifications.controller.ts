import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { StockNotificationsService } from './stock-notifications.service';

class SubscribeStockDto {
  @IsEmail()
  email: string;

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}

@ApiTags('Stock Notifications')
@Controller('stock-notifications')
export class StockNotificationsController {
  constructor(private readonly service: StockNotificationsService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to back-in-stock notification for a product' })
  async subscribe(@Body() body: SubscribeStockDto) {
    const result = await this.service.subscribe(body.email, body.productId, body.variantId);
    return {
      ok: true,
      message: result.alreadySubscribed
        ? "You're already subscribed. We'll email you when this is back in stock."
        : "We'll email you when this is back in stock.",
      alreadySubscribed: result.alreadySubscribed,
    };
  }
}
