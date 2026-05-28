import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a contact message' })
  async submit(@Body() dto: CreateContactDto) {
    const result = await this.contactService.submitContact(dto);
    return { success: true, id: result.id, message: 'Your message has been received. We will get back to you within 24 hours.' };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List contact messages (admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  async listContacts(
    @Query('limit') limit?: number,
    @Query('unread') unread?: string,
  ) {
    return this.contactService.listContacts(limit ? Number(limit) : 50, unread === 'true');
  }

  @Patch('admin/:id/read')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark contact message as read (admin)' })
  async markAsRead(@Param('id') id: string) {
    await this.contactService.markAsRead(id);
    return { success: true };
  }
}
