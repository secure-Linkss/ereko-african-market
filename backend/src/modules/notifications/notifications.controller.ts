import {
  Controller, Get, Patch, Param, Query, UseGuards,
  HttpCode, HttpStatus, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../../supabase/supabase.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    let q = this.supabase.db
      .from('Notification')
      .select('id, type, title, body, data, isRead, createdAt')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (unreadOnly === 'true') q = q.eq('isRead', false);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const unreadCount = (data ?? []).filter((n: any) => !n.isRead).length;
    return { notifications: data ?? [], unreadCount };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', type: 'string' })
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.supabase.db
      .from('Notification')
      .update({ isRead: true })
      .eq('id', id)
      .eq('userId', userId);
    return { success: true };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.supabase.db
      .from('Notification')
      .update({ isRead: true })
      .eq('userId', userId)
      .eq('isRead', false);
    return { success: true };
  }
}
