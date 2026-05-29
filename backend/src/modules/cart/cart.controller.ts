import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { SyncCartDto, ApplyCouponDto, RedeemLoyaltyDto } from './cart.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'x-anonymous-token',
  description: 'Anonymous cart token (used when not authenticated)',
  required: false,
})
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current cart' })
  @ApiOkResponse({ description: 'Returns the current cart with all items and totals' })
  async getCart(
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.getCart(user?.id, anonymousToken);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync cart items (replaces all items)' })
  async syncCart(
    @Body() dto: SyncCartDto,
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.syncCart(dto, user?.id, anonymousToken);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all items in the cart' })
  async getItems(
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.getItems(user?.id, anonymousToken);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get a single cart item by ID' })
  async getItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.getItem(id, user?.id, anonymousToken);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a promo code to the cart' })
  async applyCoupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.applyCoupon(dto, user?.id, anonymousToken);
  }

  @Post('loyalty/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem loyalty points for a discount on the cart' })
  async redeemLoyalty(
    @Body() dto: RedeemLoyaltyDto,
    @CurrentUser() user: any,
    @Headers('x-anonymous-token') anonymousToken?: string,
  ) {
    return this.cartService.redeemLoyalty(dto, user?.id, anonymousToken);
  }
}
