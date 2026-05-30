import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { StaffRole, TeamMemberStatus, InviteTeamMemberDto, UpdateTeamMemberDto, AcceptInviteDto, SendAdminEmailDto } from './team.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

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
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  hasPermission(role: StaffRole, permission: string): boolean {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  async getTeamMembers() {
    const { data: members } = await this.supabase.db
      .from('TeamMember')
      .select('id, userId, role, status, lastLogin, createdAt')
      .order('role', { ascending: true });

    if (!members?.length) return [];

    const userIds = members.map((m: any) => m.userId);
    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, firstName, lastName, createdAt')
      .in('id', userIds);

    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

    return members.map((m: any) => {
      const user = userMap.get(m.userId) ?? {};
      return {
        id: m.id,
        userId: m.userId,
        email: (user as any).email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        role: m.role,
        status: m.status,
        lastLogin: m.lastLogin ?? null,
        permissions: ROLE_PERMISSIONS[m.role as StaffRole],
        createdAt: m.createdAt,
      };
    });
  }

  async inviteMember(dto: InviteTeamMemberDto, invitedBy: string) {
    const { data: userRows } = await this.supabase.db
      .from('User')
      .select('id, email')
      .eq('email', dto.email)
      .limit(1);

    const existingUser = userRows?.[0];

    if (existingUser) {
      const { data: memberRows } = await this.supabase.db
        .from('TeamMember')
        .select('id')
        .eq('userId', existingUser.id)
        .limit(1);
      if (memberRows?.[0]) throw new ConflictException('User is already a team member');
    }

    const inviteToken = uuidv4();
    const tokenHash = createHash('sha256').update(inviteToken).digest('hex');
    const expiry = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000).toISOString();
    const now = new Date().toISOString();

    // viewer role gets read-only access; all other staff roles get isAdmin=true
    const grantAdmin = dto.role !== StaffRole.viewer;

    let userId: string;
    if (!existingUser) {
      userId = uuidv4();
      await this.supabase.db.from('User').insert({
        id: userId,
        email: dto.email,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        isAdmin: grantAdmin,
        isActive: false,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      userId = existingUser.id;
      await this.supabase.db
        .from('User')
        .update({ isAdmin: grantAdmin, updatedAt: now })
        .eq('id', userId);
    }

    const memberId = uuidv4();
    await this.supabase.db.from('TeamMember').insert({
      id: memberId,
      userId,
      role: dto.role,
      status: TeamMemberStatus.invited,
      invitedBy,
      inviteToken: tokenHash,
      inviteExpiry: expiry,
      createdAt: now,
      updatedAt: now,
    });

    const frontendUrl = this.config.get<string>('frontend.url');
    const inviteLink = `${frontendUrl}/admin/accept-invite?token=${inviteToken}`;

    await this.notifications.sendEmail({
      to: dto.email,
      subject: "You've been invited to join the EREKO admin team",
      html: `
        <h2>Welcome to EREKO</h2>
        <p>You've been invited to join the EREKO admin team as <strong>${dto.role}</strong>.</p>
        <p><a href="${inviteLink}" style="background:#E85D04;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
        <p>This link expires in ${INVITE_EXPIRY_HOURS} hours.</p>
        <p>If you didn't expect this, please ignore this email.</p>
      `,
      text: `You've been invited to join EREKO as ${dto.role}. Accept at: ${inviteLink}`,
    });

    return { id: memberId, email: dto.email, role: dto.role, status: TeamMemberStatus.invited };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const { data: memberRows } = await this.supabase.db
      .from('TeamMember')
      .select('id, userId, status, inviteExpiry')
      .eq('inviteToken', tokenHash)
      .limit(1);

    const member = memberRows?.[0];
    if (!member) throw new BadRequestException('Invalid invite token');
    if (member.status !== TeamMemberStatus.invited) throw new BadRequestException('Invite already accepted or revoked');
    if (member.inviteExpiry && new Date(member.inviteExpiry) < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    const { data: userRows } = await this.supabase.db
      .from('User')
      .select('email')
      .eq('id', member.userId)
      .limit(1);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();

    await this.supabase.db
      .from('User')
      .update({
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: true,
        emailVerified: true,
        updatedAt: now,
      })
      .eq('id', member.userId);

    await this.supabase.db
      .from('TeamMember')
      .update({
        status: TeamMemberStatus.active,
        inviteToken: null,
        inviteExpiry: null,
        updatedAt: now,
      })
      .eq('id', member.id);

    return { success: true, email: userRows?.[0]?.email };
  }

  async updateMember(memberId: string, dto: UpdateTeamMemberDto, actorRole: StaffRole) {
    const { data: memberRows } = await this.supabase.db
      .from('TeamMember')
      .select('id, userId, role')
      .eq('id', memberId)
      .limit(1);

    const member = memberRows?.[0];
    if (!member) throw new NotFoundException('Team member not found');

    if (member.role === StaffRole.owner && actorRole !== StaffRole.owner) {
      throw new ForbiddenException('Only an owner can modify another owner');
    }

    const now = new Date().toISOString();
    await this.supabase.db
      .from('TeamMember')
      .update({ role: dto.role, updatedAt: now })
      .eq('id', memberId);

    if (dto.role) {
      await this.supabase.db
        .from('User')
        .update({ isAdmin: dto.role !== StaffRole.viewer, updatedAt: now })
        .eq('id', member.userId);
    }

    const { data: userRows } = await this.supabase.db
      .from('User')
      .select('email, firstName, lastName')
      .eq('id', member.userId)
      .limit(1);

    return { id: memberId, email: userRows?.[0]?.email, role: dto.role };
  }

  async suspendMember(memberId: string, actorId: string, actorRole: StaffRole) {
    const { data: memberRows } = await this.supabase.db
      .from('TeamMember')
      .select('id, userId, role')
      .eq('id', memberId)
      .limit(1);

    const member = memberRows?.[0];
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === StaffRole.owner) throw new ForbiddenException('Cannot suspend owner');
    if (member.userId === actorId) throw new ForbiddenException('Cannot suspend yourself');

    const now = new Date().toISOString();

    await this.supabase.db
      .from('TeamMember')
      .update({ status: TeamMemberStatus.suspended, updatedAt: now })
      .eq('id', memberId);

    await this.supabase.db
      .from('User')
      .update({ isActive: false, isAdmin: false, updatedAt: now })
      .eq('id', member.userId);

    // Revoke all refresh tokens for this user
    await this.supabase.db
      .from('RefreshToken')
      .update({ revokedAt: now })
      .eq('userId', member.userId)
      .is('revokedAt', null);

    return { success: true };
  }

  async removeMember(memberId: string, actorId: string, actorRole: StaffRole) {
    const { data: memberRows } = await this.supabase.db
      .from('TeamMember')
      .select('id, userId, role')
      .eq('id', memberId)
      .limit(1);

    const member = memberRows?.[0];
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === StaffRole.owner) throw new ForbiddenException('Cannot remove owner');
    if (member.userId === actorId) throw new ForbiddenException('Cannot remove yourself');

    const now = new Date().toISOString();

    await this.supabase.db.from('TeamMember').delete().eq('id', memberId);
    await this.supabase.db
      .from('User')
      .update({ isAdmin: false, updatedAt: now })
      .eq('id', member.userId);
    await this.supabase.db.from('RefreshToken').delete().eq('userId', member.userId);

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

  async updateSmtpConfig(
    config: {
      host: string; port: number; secure: boolean;
      user: string; pass: string; fromEmail: string; fromName: string;
    },
    actorId: string,
  ) {
    const passEncrypted = await bcrypt.hash(config.pass, 10);
    const now = new Date().toISOString();

    const { data: existing } = await this.supabase.db
      .from('SmtpConfig')
      .select('id')
      .limit(1)
      .single();

    const payload = {
      host: config.host, port: config.port, secure: config.secure,
      user: config.user, passEncrypted, fromEmail: config.fromEmail,
      fromName: config.fromName, isActive: true, updatedBy: actorId, updatedAt: now,
    };

    if (existing) {
      const { data } = await this.supabase.db
        .from('SmtpConfig')
        .update(payload)
        .eq('id', existing.id)
        .select('id, host, port, fromEmail, fromName, isActive')
        .single();
      return data;
    }

    const { data } = await this.supabase.db
      .from('SmtpConfig')
      .insert({ id: uuidv4(), ...payload })
      .select('id, host, port, fromEmail, fromName, isActive')
      .single();
    return data;
  }
}
