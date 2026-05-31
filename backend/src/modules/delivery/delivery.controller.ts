import {
  Controller, Get, Post, Put, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeliveryService } from './delivery.service';
import { CalculateDeliveryFeeDto, UpdateDeliverySettingsDto } from './delivery.dto';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Get delivery settings and tiers (public)' })
  async getSettings() {
    await this.deliveryService.seedDefaultTiers();
    return this.deliveryService.getFullSettings();
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate delivery fee for a postcode (public)' })
  async calculateFee(@Body() dto: CalculateDeliveryFeeDto) {
    await this.deliveryService.seedDefaultTiers();
    return this.deliveryService.calculateDeliveryFee(dto.customerPostcode);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update delivery settings and tiers (admin/owner/super admin)' })
  async updateSettings(
    @Body() dto: UpdateDeliverySettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.deliveryService.updateSettings(dto, actorId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('seed-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default delivery tiers (admin — run once on setup)' })
  async seedDefaults() {
    await this.deliveryService.seedDefaultTiers();
    return { ok: true };
  }
}
