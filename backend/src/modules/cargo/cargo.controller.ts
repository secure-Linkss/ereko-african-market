import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CargoService } from './cargo.service';
import { CargoInquireDto, CargoEstimateDto } from './cargo.dto';

@ApiTags('Cargo')
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  /**
   * POST /api/v1/cargo/inquire
   *
   * Public endpoint — no auth required. If a valid JWT is present the user is
   * linked to the inquiry, otherwise it is anonymous.
   */
  @Post('inquire')
  @Public()
  @ApiOperation({ summary: 'Submit a cargo shipping inquiry' })
  @ApiResponse({ status: 201, description: 'Cargo inquiry created with tracking number' })
  @ApiBearerAuth('access-token')
  async inquire(
    @Body() dto: CargoInquireDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.cargoService.inquire(dto, userId);
  }

  /**
   * POST /api/v1/cargo/estimate
   *
   * Fully public — no auth required.
   */
  @Post('estimate')
  @Public()
  @ApiOperation({ summary: 'Get a cargo shipping estimate (public)' })
  @ApiResponse({ status: 201, description: 'Estimated quote and delivery days' })
  async estimate(@Body() dto: CargoEstimateDto) {
    return this.cargoService.estimate(dto);
  }

  /**
   * GET /api/v1/cargo/track/:trackingNumber
   *
   * Fully public — no auth required.
   */
  @Get('track/:trackingNumber')
  @Public()
  @ApiOperation({ summary: 'Track a cargo shipment by tracking number (public)' })
  @ApiParam({ name: 'trackingNumber', example: 'ERK-CRG-AB12CD34' })
  @ApiResponse({ status: 200, description: 'Cargo shipment details' })
  @ApiResponse({ status: 404, description: 'Tracking number not found' })
  async track(@Param('trackingNumber') trackingNumber: string) {
    return this.cargoService.track(trackingNumber);
  }

  @Get('rates')
  @Public()
  @ApiOperation({ summary: 'Get current cargo rates for sea and air freight (public)' })
  @ApiResponse({ status: 200, description: 'Current cargo rates' })
  async getRates() {
    return this.cargoService.getCargoRates();
  }

  @Post('estimate-by-mode')
  @Public()
  @ApiOperation({ summary: 'Get weight-based cargo estimate for a specific mode (public)' })
  @ApiResponse({ status: 201, description: 'Weight-based cargo estimate' })
  async estimateByMode(@Body() body: { weightKg: number; mode: 'sea' | 'air' }) {
    return this.cargoService.estimateByMode(body.weightKg, body.mode);
  }
}
