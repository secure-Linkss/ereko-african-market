import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TeamService } from './team.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  InviteTeamMemberDto,
  UpdateTeamMemberDto,
  AcceptInviteDto,
  SendAdminEmailDto,
} from './team.dto';

@ApiTags('Admin — Team Management')
@ApiBearerAuth('access-token')
@Controller('admin/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all team members' })
  getTeamMembers() {
    return this.teamService.getTeamMembers();
  }

  @Post('invite')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Invite a new team member' })
  @ApiResponse({ status: 201, description: 'Invite sent' })
  inviteMember(@Body() dto: InviteTeamMemberDto, @CurrentUser('id') actorId: string) {
    return this.teamService.inviteMember(dto, actorId);
  }

  @Post('accept-invite')
  @Public()
  @ApiOperation({ summary: 'Accept team invite and set password' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.teamService.acceptInvite(dto);
  }

  @Patch(':memberId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update team member role' })
  updateMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() actor: any,
  ) {
    return this.teamService.updateMember(memberId, dto, actor.teamRole);
  }

  @Post(':memberId/suspend')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend team member' })
  suspendMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() actor: any,
  ) {
    return this.teamService.suspendMember(memberId, actor.id, actor.teamRole);
  }

  @Delete(':memberId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove team member' })
  removeMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() actor: any,
  ) {
    return this.teamService.removeMember(memberId, actor.id, actor.teamRole);
  }

  @Post('email/send')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email to a customer from admin panel' })
  sendAdminEmail(@Body() dto: SendAdminEmailDto, @CurrentUser() actor: any) {
    return this.teamService.sendAdminEmail(dto, actor.email);
  }
}
