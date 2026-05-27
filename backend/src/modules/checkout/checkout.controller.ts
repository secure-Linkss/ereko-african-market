import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import {
  StartCheckoutDto,
  PaymentIntentDto,
  ConfirmOrderDto,
} from './checkout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Checkout')
@ApiBearerAuth('access-token')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('delivery-slots')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get available delivery slots for a postcode' })
  @ApiQuery({ name: 'postcode', required: true, example: 'SW1A 1AA' })
  async getDeliverySlots(@Query('postcode') postcode: string) {
    return this.checkoutService.getDeliverySlots(postcode);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Start checkout — reserve stock and create pending order' })
  @ApiOkResponse({
    description: 'Returns orderId, orderNumber, cart snapshot, stockReservedUntil, and delivery slots',
  })
  async startCheckout(
    @Body() dto: StartCheckoutDto,
    @CurrentUser() user: any,
  ) {
    return this.checkoutService.startCheckout(dto, user?.id);
  }

  @Post('payment-intent')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for an order' })
  @ApiOkResponse({ description: 'Returns clientSecret, publishableKey, amountMinor' })
  async createPaymentIntent(
    @Body() dto: PaymentIntentDto,
    @CurrentUser() user: any,
  ) {
    return this.checkoutService.createPaymentIntent(dto, user?.id);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Confirm order with addresses, delivery slot, and payment intent' })
  @ApiOkResponse({ description: 'Returns { order, success }' })
  async confirmOrder(
    @Body() dto: ConfirmOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.checkoutService.confirmOrder(dto, user?.id);
  }
}
