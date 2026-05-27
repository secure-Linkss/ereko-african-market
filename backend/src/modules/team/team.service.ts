import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { StaffRole, TeamMemberStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  InviteTeamMemberDto,
  UpdateTeamMemberDto,
  AcceptInviteDto,
  SendAdminEmailDto,
} from './team.dto';

const INVITE_EXPIRY_HOURS = 48;
const BCRYPT_ROUNDS = 12;

const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: ['*'],
  admin: [
    'orders:read', 'orders:write',
    'inventory:read', 'inventory:write',
    'returns:read', 'returns:write',
    'products:read', 'products:write',
    'team:read', 'team:invite',
    'email:send', 'seo:read', 'seo:write',
    'dashboard:read',
  ],
  fulfillment: [
    'orders:read', 'orders:write',
    'inventory:read', 'inventory:write',
    'returns:read',
    'dashboard:read',
  ],
  support: [
    'orders:read',
    'returns:read', 'returns:write',
    'email:send',
    'dashboard:read',
  ],
  marketing: [
    'products:read',
    'seo:read', 'seo:write',
    'email:send',
    'dashboard:read',
  ],
  viewer: [
    'orders:read',
    'inventory:read',
    'dashboard:read',
  ],
};

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  hasPermission(role: StaffRole, permission: string): boolean {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  async getTeamMembers() {
    const members = await this.prisma.teamMember.findMany({
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return members.map(m => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      status: m.status,
      lastLogin: m.lastLogin?.toISOString() ?? null,
      permissions: ROLE_PERMISSIONS[m.role],
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async inviteMember(dto: InviteTeamMemberDto, invitedBy: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const existingMember = existingUser ? await this.prisma.teamMember.findUnique({ where: { userId: existingUser.id } }) : null;
    if (existingMember) {
      throw new ConflictException('User is already a team member');
    }

    const inviteToken = uuidv4();
    const tokenHash = createHash('sha256').update(inviteToken).digest('hex');
    const expiry = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000);

    let user = existingUser;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isAdmin: true,
          isActive: false,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    const member = await this.prisma.teamMember.create({
      data: {
        userId: user.id,
        role: dto.role,
        status: TeamMemberStatus.invited,
        invitedBy,
        inviteToken: tokenHash,
        inviteExpiry: expiry,
      },
    });

    const frontendUrl = this.config.get<string>('frontend.url');
    const inviteLink = `${frontendUrl}/admin/accept-invite?token=${inviteToken}`;

    await this.notifications.sendEmail({
      to: dto.email,
      subject: 'You\'ve been invited to join the EREKO admin team',
      html: `
        <h2>Welcome to EREKO</h2>
        <p>You've been invited to join the EREKO admin team as <strong>${dto.role}</strong>.</p>
        <p><a href="${inviteLink}" style="background:#E85D04;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
        <p>This link expires in ${INVITE_EXPIRY_HOURS} hours.</p>
        <p>If you didn't expect this, please ignore this email.</p>
      `,
      text: `You've been invited to join EREKO as ${dto.role}. Accept at: ${inviteLink}`,
    });

    return { id: member.id, email: dto.email, role: dto.role, status: member.status };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const member = await this.prisma.teamMember.findUnique({
      where: { inviteToken: tokenHash },
      include: { user: true },
    });

    if (!member) throw new BadRequestException('Invalid invite token');
    if (member.status !== TeamMemberStatus.invited) throw new BadRequestException('Invite already accepted or revoked');
    if (member.inviteExpiry && member.inviteExpiry < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: member.userId },
        data: {
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isActive: true,
          emailVerified: true,
        },
      }),
      this.prisma.teamMember.update({
        where: { id: member.id },
        data: {
          status: TeamMemberStatus.active,
          inviteToken: null,
          inviteExpiry: null,
        },
      }),
    ]);

    return { success: true, email: member.user.email };
  }

  async updateMember(memberId: string, dto: UpdateTeamMemberDto, actorRole: StaffRole) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Team member not found');

    if (member.role === StaffRole.owner && actorRole !== StaffRole.owner) {
      throw new ForbiddenException('Only an owner can modify another owner');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    if (dto.role) {
      await this.prisma.user.update({
        where: { id: member.userId },
        data: { isAdmin: dto.role !== StaffRole.viewer },
      });
    }

    return { id: updated.id, email: updated.user.email, role: updated.role };
  }

  async suspendMember(memberId: string, actorId: string, actorRole: StaffRole) {
    const member = await this.prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === StaffRole.owner) throw new ForbiddenException('Cannot suspend owner');
    if (member.userId === actorId) throw new ForbiddenException('Cannot suspend yourself');

    await this.prisma.$transaction([
      this.prisma.teamMember.update({
        where: { id: memberId },
        data: { status: TeamMemberStatus.suspended },
      }),
      this.prisma.user.update({
        where: { id: member.userId },
        data: { isActive: false, isAdmin: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: member.userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async removeMember(memberId: string, actorId: string, actorRole: StaffRole) {
    const member = await this.prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === StaffRole.owner) throw new ForbiddenException('Cannot remove owner');
    if (member.userId === actorId) throw new ForbiddenException('Cannot remove yourself');

    await this.prisma.$transaction([
      this.prisma.teamMember.delete({ where: { id: memberId } }),
      this.prisma.user.update({
        where: { id: member.userId },
        data: { isAdmin: false },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: member.userId } }),
    ]);

    return { success: true };
  }

  async sendAdminEmail(dto: SendAdminEmailDto, actorEmail: string) {
    await this.notifications.sendEmail({
      to: dto.to,
      subject: dto.subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          ${dto.body.replace(/\n/g, '<br>')}
          <hr style="margin-top:40px;border:none;border-top:1px solid #eee">
          <p style="color:#999;font-size:12px">Sent by EREKO admin team (${actorEmail})</p>
        </div>
      `,
      text: dto.body,
      replyTo: dto.replyTo ?? actorEmail,
    });
    return { success: true };
  }

  async updateSmtpConfig(config: {
    host: string; port: number; secure: boolean;
    user: string; pass: string; fromEmail: string; fromName: string;
  }, actorId: string) {
    const passEncrypted = await bcrypt.hash(config.pass, 10);
    const existing = await this.prisma.smtpConfig.findFirst();

    if (existing) {
      return this.prisma.smtpConfig.update({
        where: { id: existing.id },
        data: {
          host: config.host, port: config.port, secure: config.secure,
          user: config.user, passEncrypted, fromEmail: config.fromEmail,
          fromName: config.fromName, isActive: true, updatedBy: actorId,
        },
        select: { id: true, host: true, port: true, fromEmail: true, fromName: true, isActive: true },
      });
    }

    return this.prisma.smtpConfig.create({
      data: {
        host: config.host, port: config.port, secure: config.secure,
        user: config.user, passEncrypted, fromEmail: config.fromEmail,
        fromName: config.fromName, isActive: true, updatedBy: actorId,
      },
      select: { id: true, host: true, port: true, fromEmail: true, fromName: true, isActive: true },
    });
  }
}
