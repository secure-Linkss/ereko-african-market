import {
  Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundsService, CreateRefundDto } from './refunds.service';

@ApiTags('Refunds')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get(':orderId/summary')
  @ApiOperation({ summary: 'Get order refund summary (items, existing refunds, max refundable amount)' })
  @ApiParam({ name: 'orderId' })
  async getRefundSummary(@Param('orderId') orderId: string) {
    return this.refundsService.getOrderRefundSummary(orderId);
  }

  @Post(':orderId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a partial or full refund for an order' })
  @ApiParam({ name: 'orderId' })
  async processRefund(
    @Param('orderId') orderId: string,
    @Body() body: Omit<CreateRefundDto, 'orderId'>,
    @CurrentUser() actor: any,
  ) {
    if (!actor.isSuperAdmin && !actor.isAdmin && actor.teamRole !== 'owner') {
      throw new ForbiddenException('Admin or owner access required to process refunds');
    }

    return this.refundsService.processRefund({ ...body, orderId }, actor.id);
  }

  @Get(':orderId/history')
  @ApiOperation({ summary: 'Get refund history for an order' })
  @ApiParam({ name: 'orderId' })
  async getRefundHistory(@Param('orderId') orderId: string) {
    return this.refundsService.listRefundsForOrder(orderId);
  }
}
