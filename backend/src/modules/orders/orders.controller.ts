import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateReturnDto } from './orders.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly pdfService: PdfService,
  ) {}

  /** Public — no auth, lookup by orderNumber + email */
  @Get('track')
  @Public()
  @ApiOperation({ summary: 'Public order tracking — lookup by order number + email' })
  @ApiQuery({ name: 'orderNumber', required: true, type: String })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Order tracking timeline and status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async trackPublic(
    @Query('orderNumber') orderNumber: string,
    @Query('email') email: string,
  ) {
    return this.ordersService.getPublicTracking(orderNumber, email);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List orders for authenticated user (cursor paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  async listOrders(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.ordersService.listOrders(userId, limit, cursor);
  }

  @Get(':id/tracking')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get full tracking for an authenticated user\'s order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order tracking details with step timeline' })
  async getTracking(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderTracking(userId, id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 403, description: 'Forbidden — order belongs to another user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrder(userId, id);
  }

  @Post(':orderId/returns')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request a return / RMA for an order' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 201, description: 'RMA created' })
  @ApiResponse({ status: 400, description: 'Validation or business rule failure' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createReturn(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.ordersService.createReturn(userId, orderId, dto);
  }

  @Get(':id/receipt.pdf')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download payment receipt PDF for an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async downloadReceipt(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const receiptData = await this.ordersService.getReceiptData(userId, id);
    if (!receiptData) throw new NotFoundException('Order not found');

    const pdfBuffer = await this.pdfService.generateReceiptBuffer(receiptData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${receiptData.orderNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
