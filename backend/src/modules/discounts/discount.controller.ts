import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, Request, Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/decorators/public.decorator';
import { DiscountService } from './discount.service';
import {
  CreateDiscountCodeDto, UpdateDiscountCodeDto, ValidateDiscountDto, SetProductDiscountDto,
} from './discount.dto';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  // ─── Public: Validate a code ──────────────────────────────────────────────────

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min per IP
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a discount code against a cart total' })
  async validate(@Body() dto: ValidateDiscountDto) {
    return this.discountService.validate(dto);
  }

  // ─── Admin: List all codes ────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  @ApiOperation({ summary: 'Admin: list all discount codes' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  async listCodes(@Query('all') all?: string) {
    return this.discountService.listCodes(all === 'true');
  }

  // ─── Admin: Get single code ───────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Admin: get discount code detail' })
  async getCode(@Param('id') id: string) {
    return this.discountService.getCode(id);
  }

  // ─── Admin: Get code usages ───────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id/usages')
  @ApiOperation({ summary: 'Admin: get usage history for a discount code' })
  async getCodeUsages(@Param('id') id: string) {
    return this.discountService.getCodeUsages(id);
  }

  // ─── Admin: Create code ───────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({ summary: 'Admin: create discount code' })
  async createCode(@Body() dto: CreateDiscountCodeDto) {
    return this.discountService.createCode(dto);
  }

  // ─── Admin: Update code ───────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update discount code' })
  async updateCode(@Param('id') id: string, @Body() dto: UpdateDiscountCodeDto) {
    return this.discountService.updateCode(id, dto);
  }

  // ─── Admin: Delete code ───────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete discount code' })
  async deleteCode(@Param('id') id: string) {
    return this.discountService.deleteCode(id);
  }

  // ─── Admin: Set product discount ──────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('products/:productId')
  @ApiOperation({ summary: 'Admin: enable/disable product-level discount and badge' })
  async setProductDiscount(
    @Param('productId') productId: string,
    @Body() dto: SetProductDiscountDto,
  ) {
    return this.discountService.setProductDiscount(
      productId,
      dto.discountEnabled,
      dto.discountPercent,
      dto.discountBadge,
    );
  }
}
