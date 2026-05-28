import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Inject,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto, AdjustInventoryDto, ResolveReturnDto, OrderStatus } from './admin.dto';
import { Request } from 'express';
import { Req } from '@nestjs/common';

/** Cache TTLs in seconds */
const DASHBOARD_TTL = 60;
const RETURNS_TTL = 120;

/** Cache keys */
const DASHBOARD_CACHE_KEY = 'admin:dashboard:v1';
const RETURNS_CACHE_KEY = 'admin:returns:v1';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Resolve the Idempotency-Key header, throwing if absent. */
  private getIdempotencyKey(req: Request): string {
    const key =
      (req.headers['idempotency-key'] as string | undefined) ??
      (req.headers['Idempotency-Key'] as string | undefined);
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return key;
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary: 'Admin dashboard KPI stats',
    description: 'Returns today order count, revenue, low stock count, pending refunds, active disputes, webhook failures. Cached for 1 minute.',
  })
  async getDashboard() {
    const cached = await this.cache.get<object>(DASHBOARD_CACHE_KEY);
    if (cached) return cached;

    const stats = await this.adminService.getDashboardStats();
    await this.cache.set(DASHBOARD_CACHE_KEY, stats, DASHBOARD_TTL);
    return stats;
  }

  // ─── ORDERS ────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List all orders — cursor pagination, optional status filter + full-text search' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Max 100, default 20' })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'q', type: String, required: false, description: 'Search orderNumber or email' })
  async listOrders(
    @Query('status') status?: OrderStatus,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    return this.adminService.listOrders(status, limit, cursor, q);
  }

  @Patch('orders/:orderId/status')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Manually advance or change an order status' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '24-hour idempotency window' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const key = this.getIdempotencyKey(req);
    // Merge route param — frontend contract puts orderId in body too
    dto.orderId = orderId;
    return this.adminService.updateOrderStatus(dto, actorId, key);
  }

  // ─── INVENTORY ─────────────────────────────────────────────────────────────

  @Get('inventory')
  @ApiOperation({ summary: 'List warehouse stock — cursor pagination' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  async listInventory(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.listInventory(cursor, limit);
  }

  @Post('inventory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust warehouse stock (positive = receive, negative = consume/remove)' })
  async adjustInventory(
    @Body() dto: AdjustInventoryDto,
    @CurrentUser('id') actorId: string,
  ) {
    await this.adminService.adjustInventory(dto, actorId);
    return { ok: true };
  }

  // ─── RETURNS ───────────────────────────────────────────────────────────────

  @Get('returns')
  @ApiOperation({ summary: 'List all return requests (cached 2 minutes)' })
  async listReturns() {
    const cached = await this.cache.get<object[]>(RETURNS_CACHE_KEY);
    if (cached) return cached;

    const returns = await this.adminService.listReturns();
    await this.cache.set(RETURNS_CACHE_KEY, returns, RETURNS_TTL);
    return returns;
  }

  @Post('returns/:rmaId/resolve')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a return; approve triggers Stripe refund' })
  @ApiParam({ name: 'rmaId', description: 'Return/RMA UUID' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async resolveReturn(
    @Param('rmaId') rmaId: string,
    @Body() dto: ResolveReturnDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const key = this.getIdempotencyKey(req);
    dto.rmaId = rmaId;

    await this.adminService.resolveReturn(dto, actorId, key);

    // Bust returns cache so next GET is fresh
    await this.cache.del(RETURNS_CACHE_KEY);

    return { ok: true, rmaId, action: dto.action };
  }
}
