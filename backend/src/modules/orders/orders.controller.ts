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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateReturnDto } from './orders.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
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

  @Get(':id')
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
}
