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
  ForbiddenException,
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
import { CargoService } from '../cargo/cargo.service';
import { ReviewsService } from '../reviews/reviews.service';
import { Request } from 'express';
import { Req, Delete, UploadedFile, UseInterceptors as UseFileInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

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
    private readonly cargoService: CargoService,
    private readonly reviewsService: ReviewsService,
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

  @Post('inventory/seed-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed WarehouseStock for all active variants in all active warehouses' })
  async seedAllInventory(@CurrentUser('id') actorId: string) {
    return this.adminService.seedAllInventory(actorId);
  }

  @Post('maintenance/run-migrations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run one-time schema migrations (idempotent — safe to call repeatedly)' })
  async runMigrations() {
    return this.adminService.runOrderStatusMigration();
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

  // ── Cargo Rates ──────────────────────────────────────────────────────────

  @Get('cargo-rates')
  @ApiOperation({ summary: 'Get all cargo rates (admin)' })
  async getCargoRates() {
    return this.cargoService.getCargoRates();
  }

  @Patch('cargo-rates/:mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cargo rate for a specific mode (sea | air)' })
  @ApiParam({ name: 'mode', enum: ['sea', 'air'] })
  async updateCargoRate(
    @Param('mode') mode: string,
    @Body() body: { pricePerKgMinor?: number; minWeightKg?: number; transitDaysMin?: number; transitDaysMax?: number; notes?: string },
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.cargoService.updateCargoRate(mode, {
      ...(body.pricePerKgMinor !== undefined && { price_per_kg_minor: Math.round(body.pricePerKgMinor) }),
      ...(body.minWeightKg !== undefined && { min_weight_kg: body.minWeightKg }),
      ...(body.transitDaysMin !== undefined && { transit_days_min: body.transitDaysMin }),
      ...(body.transitDaysMax !== undefined && { transit_days_max: body.transitDaysMax }),
      ...(body.notes !== undefined && { notes: body.notes }),
    }, adminEmail);
  }

  // ── Product Management ───────────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'List all products (admin)' })
  async listProducts(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.listProducts(limit, cursor);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product (admin)' })
  async createProduct(
    @Body() body: any,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.createProduct(body, adminId);
  }

  @Patch('products/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a product (admin)' })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() body: any,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateProduct(productId, body, adminId);
  }

  @Delete('products/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a product (admin)' })
  async deleteProduct(
    @Param('productId') productId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteProduct(productId, adminId);
  }

  @Post('products/:productId/images')
  @ApiOperation({ summary: 'Upload product image to Supabase CDN (admin)' })
  @UseFileInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: jpeg, png, webp, avif, gif`), false);
      }
      cb(null, true);
    },
  }))
  async uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') adminId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded or file type not allowed');
    return this.adminService.uploadProductImage(productId, file, adminId);
  }

  // ── Reviews Management ───────────────────────────────────────────────────

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews with optional status filter (admin)' })
  @ApiQuery({ name: 'status', enum: ['pending', 'approved', 'rejected'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async listReviews(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.reviewsService.listAllReviews(status, limit);
  }

  @Patch('reviews/:id/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a review (admin)' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  async moderateReview(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' },
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.reviewsService.moderateReview(id, body.action, adminEmail);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review (admin)' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  async deleteReview(@Param('id') id: string) {
    return this.reviewsService.deleteReview(id);
  }

  // ── User Management ───────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List customer/user accounts (admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'role', required: false, enum: ['customer', 'staff', 'all'] })
  async listUsers(
    @CurrentUser() actor: any,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
  ) {
    // Only owners and super admins may query staff/all accounts (which includes admin privilege flags)
    const canSeeElevated = actor.isSuperAdmin || actor.teamRole === 'owner';
    const effectiveRole = (role === 'staff' || role === 'all') && !canSeeElevated ? 'customer' : role;
    return this.adminService.listUsers(limit, cursor, q, effectiveRole);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Suspend or activate a user account (owner+ only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: { isActive: boolean; reason?: string },
    @CurrentUser() actor: any,
  ) {
    if (!actor.isSuperAdmin && actor.teamRole !== 'owner') {
      throw new ForbiddenException('Only owners and super admins can change user account status');
    }
    return this.adminService.updateUserStatus(userId, body.isActive, body.reason, actor.id);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user detail with orders and loyalty (admin)' })
  async getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  // ── Audit Log ─────────────────────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log entries (super admin / owner)' })
  @ApiQuery({ name: 'staffId', required: false, description: 'Filter by staff member ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLog(
    @CurrentUser() actor: any,
    @Query('staffId') staffId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    if (!actor.isSuperAdmin && actor.teamRole !== 'owner') {
      throw new ForbiddenException('Only owners and super admins can access the audit log');
    }
    return this.adminService.getAuditLog(staffId, limit);
  }

  // ── Custom Notification Send ───────────────────────────────────────────────

  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send custom in-app + email notification to user(s) (owner/superAdmin)' })
  async sendCustomNotification(
    @CurrentUser() actor: any,
    @Body() body: {
      targetUserId?: string;       // single user — omit for broadcast to all customers
      title: string;
      message: string;
      sendEmail?: boolean;         // also send email (default true)
      emailSubject?: string;
    },
  ) {
    if (!actor.isSuperAdmin && actor.teamRole !== 'owner' && actor.isAdmin !== true) {
      throw new ForbiddenException('Admin access required to send notifications');
    }
    return this.adminService.sendCustomNotification({
      targetUserId: body.targetUserId,
      title: body.title,
      message: body.message,
      sendEmail: body.sendEmail !== false,
      emailSubject: body.emailSubject,
      actorId: actor.id,
    });
  }
}
