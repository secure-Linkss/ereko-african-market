import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoginDto, SignupDto, MfaVerifyDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Rate Limiting ─────────────────────────────────────────────────────────

  private async checkRateLimit(key: string): Promise<void> {
    const cacheKey = `auth:rl:${key}`;
    const current = (await this.cache.get<number>(cacheKey)) ?? 0;
    if (current >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException('Too many login attempts. Please wait 1 minute before trying again.');
    }
    await this.cache.set(cacheKey, current + 1, LOGIN_WINDOW_SECONDS);
  }

  private async clearRateLimit(key: string): Promise<void> {
    await this.cache.del(`auth:rl:${key}`);
  }

  // ─── Token Helpers ─────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      },
    );
  }

  private async issueRefreshToken(userId: string, family: string, req: Request): Promise<string> {
    const tokenId = uuidv4();
    const rawToken = uuidv4() + '.' + uuidv4();
    const tokenHash = this.hashToken(rawToken);

    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
    const expiresAt = new Date(Date.now() + this.parseExpiry(expiresIn)).toISOString();
    const now = new Date().toISOString();

    const { error } = await this.supabase.db.from('RefreshToken').insert({
      id: tokenId,
      userId,
      tokenHash,
      family,
      expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 512) ?? null,
      ipAddress: this.extractIp(req),
      createdAt: now,
    });

    if (error) {
      this.logger.error(`Failed to store refresh token: ${error.message}`);
      throw new Error('Failed to create session');
    }

    return rawToken;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[unit];
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress ?? 'unknown';
  }

  private setRefreshCookie(res: Response, rawToken: string): void {
    const isProduction = this.configService.get<string>('nodeEnv') === 'production';
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
    res.cookie('refresh_token', rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: this.parseExpiry(expiresIn),
      path: '/api/v1/auth',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }

  private async issueMfaToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, claim: 'mfa' },
      {
        secret: this.configService.get<string>('jwt.mfaSecret'),
        expiresIn: this.configService.get<string>('jwt.mfaExpiresIn'),
      },
    );
  }

  private formatUserProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      preferredLocale: user.preferredLocale,
      marketingEmailOptIn: user.marketingEmailOptIn,
      marketingSmsOptIn: user.marketingSmsOptIn,
      isAdmin: user.isAdmin ?? false,
      isSuperAdmin: user.isSuperAdmin ?? false,
      loyaltyTier: user.loyaltyTier ?? 'Member',
      loyaltyPointsBalance: user.loyaltyPointsBalance ?? 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, req: Request, res: Response) {
    const rateLimitKey = `login:${dto.email}`;
    await this.checkRateLimit(rateLimitKey);

    if (dto.magicLink) {
      return this.loginWithMagicLink(dto.magicLink, req, res);
    }

    const { data: users, error } = await this.supabase.db
      .from('User')
      .select('id, email, passwordHash, isAdmin, isSuperAdmin, isActive, deletedAt, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, phone, firstName, lastName, createdAt, updatedAt')
      .eq('email', dto.email)
      .limit(1);

    if (error) throw new UnauthorizedException('Invalid credentials');

    const user = users?.[0];
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!dto.password || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.clearRateLimit(rateLimitKey);

    // Check MFA
    const { data: mfaRows } = await this.supabase.db
      .from('MfaCredential')
      .select('enabled, secret')
      .eq('userId', user.id)
      .limit(1);

    const mfa = mfaRows?.[0];
    if (mfa?.enabled) {
      const mfaToken = await this.issueMfaToken(user.id);
      return { mfaRequired: true, mfaToken };
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return { accessToken, user: this.formatUserProfile(user) };
  }

  private async loginWithMagicLink(token: string, req: Request, res: Response) {
    const tokenHash = this.hashToken(token);

    const { data: links } = await this.supabase.db
      .from('MagicLinkToken')
      .select('*')
      .eq('tokenHash', tokenHash)
      .limit(1);

    const magicLink = links?.[0];
    if (!magicLink || magicLink.usedAt || new Date(magicLink.expiresAt) < new Date()) {
      throw new UnauthorizedException('Magic link is invalid or has expired');
    }

    await this.supabase.db
      .from('MagicLinkToken')
      .update({ usedAt: new Date().toISOString() })
      .eq('id', magicLink.id);

    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, isAdmin, isSuperAdmin, isActive, deletedAt, emailVerified, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, phone, firstName, lastName, createdAt, updatedAt')
      .eq('email', magicLink.email)
      .limit(1);

    const user = users?.[0];
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account not found or inactive');
    }

    if (!user.emailVerified) {
      await this.supabase.db
        .from('User')
        .update({ emailVerified: true, emailVerifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .eq('id', user.id);
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return { accessToken, user: this.formatUserProfile(user) };
  }

  // ─── Signup ────────────────────────────────────────────────────────────────

  async signup(dto: SignupDto, req: Request, res: Response) {
    const { data: existing } = await this.supabase.db
      .from('User')
      .select('id')
      .eq('email', dto.email)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new ConflictException('An account with this email already exists');
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const now = new Date().toISOString();
    const userId = uuidv4();

    const { data: newUser, error: userErr } = await this.supabase.db
      .from('User')
      .insert({
        id: userId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        phone: dto.phone ?? null,
        isActive: true,
        emailVerified: false,
        preferredLocale: 'en',
        marketingEmailOptIn: false,
        marketingSmsOptIn: false,
        createdAt: now,
        updatedAt: now,
      })
      .select('id, email, isAdmin, isSuperAdmin, firstName, lastName, phone, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, createdAt, updatedAt')
      .single();

    if (userErr || !newUser) {
      this.logger.error(`Signup user create error: ${userErr?.message}`);
      throw new BadRequestException('Failed to create account');
    }

    // Create loyalty account
    await this.supabase.db.from('LoyaltyAccount').insert({
      id: uuidv4(),
      userId,
      pointsBalance: 0,
      tier: 'Member',
      totalEarned: 0,
      totalRedeemed: 0,
      createdAt: now,
      updatedAt: now,
    });

    const accessToken = await this.issueAccessToken(userId, newUser.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(userId, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return this.formatUserProfile({ ...newUser, loyaltyTier: 'Member', loyaltyPointsBalance: 0 });
  }

  // ─── MFA Verify ────────────────────────────────────────────────────────────

  async verifyMfa(dto: MfaVerifyDto, req: Request, res: Response) {
    let payload: { sub: string; claim: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.mfaToken, {
        secret: this.configService.get<string>('jwt.mfaSecret'),
      });
    } catch {
      throw new UnauthorizedException('MFA token is invalid or expired');
    }

    if (payload.claim !== 'mfa') {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const userId = payload.sub;

    const { data: mfaRows } = await this.supabase.db
      .from('MfaCredential')
      .select('enabled, secret')
      .eq('userId', userId)
      .limit(1);

    const mfaCredential = mfaRows?.[0];
    if (!mfaCredential?.enabled) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    const isValid = authenticator.verify({ token: dto.code, secret: mfaCredential.secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, isAdmin, isSuperAdmin, isActive, deletedAt, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, phone, firstName, lastName, createdAt, updatedAt')
      .eq('id', userId)
      .limit(1);

    const user = users?.[0];
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account not found or inactive');
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return { accessToken, user: this.formatUserProfile(user) };
  }

  // ─── Forgot Password ───────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, isActive, deletedAt, firstName')
      .eq('email', dto.email)
      .limit(1);

    const user = users?.[0];
    if (!user || !user.isActive || user.deletedAt) return;

    // Invalidate existing tokens
    await this.supabase.db
      .from('PasswordResetToken')
      .update({ usedAt: new Date().toISOString() })
      .eq('userId', user.id)
      .is('usedAt', null);

    const rawToken = uuidv4() + '-' + uuidv4();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await this.supabase.db.from('PasswordResetToken').insert({
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: now,
    });

    const frontendUrl = this.configService.get<string>('frontend.url');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.notificationsService.sendPasswordReset({
      email: user.email,
      firstName: user.firstName ?? 'Customer',
      resetUrl,
    });
  }

  // ─── Reset Password ────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);

    const { data: tokens } = await this.supabase.db
      .from('PasswordResetToken')
      .select('id, userId, usedAt, expiresAt')
      .eq('tokenHash', tokenHash)
      .limit(1);

    const resetToken = tokens?.[0];
    if (!resetToken || resetToken.usedAt || new Date(resetToken.expiresAt) < new Date()) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, isActive, deletedAt')
      .eq('id', resetToken.userId)
      .limit(1);

    const user = users?.[0];
    if (!user?.isActive || user.deletedAt) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();

    await this.supabase.db
      .from('PasswordResetToken')
      .update({ usedAt: now })
      .eq('id', resetToken.id);

    await this.supabase.db
      .from('User')
      .update({ passwordHash, updatedAt: now })
      .eq('id', resetToken.userId);

    // Revoke all refresh tokens on password reset
    await this.supabase.db
      .from('RefreshToken')
      .update({ revokedAt: now })
      .eq('userId', resetToken.userId)
      .is('revokedAt', null);
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  async refresh(
    userId: string,
    family: string,
    rawToken: string,
    req: Request,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawToken);

    const { data: tokens } = await this.supabase.db
      .from('RefreshToken')
      .select('id, userId, family, tokenHash, revokedAt, expiresAt')
      .eq('tokenHash', tokenHash)
      .limit(1);

    const existingToken = tokens?.[0];

    if (!existingToken) {
      await this.supabase.db
        .from('RefreshToken')
        .update({ revokedAt: new Date().toISOString() })
        .eq('family', family)
        .is('revokedAt', null);
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    if (existingToken.revokedAt) {
      await this.supabase.db
        .from('RefreshToken')
        .update({ revokedAt: new Date().toISOString() })
        .eq('family', family)
        .is('revokedAt', null);
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    if (new Date(existingToken.expiresAt) < new Date()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token has expired');
    }

    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, isActive, deletedAt')
      .eq('id', existingToken.userId)
      .limit(1);

    const user = users?.[0];
    if (!user?.isActive || user.deletedAt) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('User account is inactive');
    }

    await this.supabase.db
      .from('RefreshToken')
      .update({ revokedAt: new Date().toISOString() })
      .eq('id', existingToken.id);

    const newRawToken = await this.issueRefreshToken(existingToken.userId, family, req);
    this.setRefreshCookie(res, newRawToken);

    const accessToken = await this.issueAccessToken(existingToken.userId, user.email);
    return { accessToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(rawToken: string | undefined, res: Response): Promise<void> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.supabase.db
        .from('RefreshToken')
        .update({ revokedAt: new Date().toISOString() })
        .eq('tokenHash', tokenHash)
        .is('revokedAt', null);
    }
    this.clearRefreshCookie(res);
  }

  // ─── Magic Link Send ───────────────────────────────────────────────────────

  async sendMagicLink(email: string): Promise<void> {
    const { data: existing } = await this.supabase.db
      .from('User')
      .select('id, isActive, deletedAt, firstName')
      .eq('email', email)
      .limit(1);

    let user = existing?.[0];
    const now = new Date().toISOString();

    if (!user) {
      const userId = uuidv4();
      const { data: newUser } = await this.supabase.db
        .from('User')
        .insert({
          id: userId,
          email,
          isActive: true,
          emailVerified: false,
          preferredLocale: 'en',
          marketingEmailOptIn: false,
          marketingSmsOptIn: false,
          createdAt: now,
          updatedAt: now,
        })
        .select('id, isActive, deletedAt, firstName')
        .single();

      if (newUser) {
        await this.supabase.db.from('LoyaltyAccount').insert({
          id: uuidv4(),
          userId,
          pointsBalance: 0,
          tier: 'Member',
          totalEarned: 0,
          totalRedeemed: 0,
          createdAt: now,
          updatedAt: now,
        });
        user = newUser;
      }
    }

    if (!user || !user.isActive || user.deletedAt) return;

    // Invalidate old tokens
    await this.supabase.db
      .from('MagicLinkToken')
      .update({ usedAt: now })
      .eq('email', email)
      .is('usedAt', null);

    const rawToken = uuidv4() + '-' + uuidv4();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await this.supabase.db.from('MagicLinkToken').insert({
      id: uuidv4(),
      email,
      tokenHash,
      expiresAt,
      createdAt: now,
    });

    const frontendUrl = this.configService.get<string>('frontend.url');
    const magicLinkUrl = `${frontendUrl}/auth/magic?token=${rawToken}`;

    await this.notificationsService.sendMagicLink({
      email,
      firstName: user.firstName ?? 'Customer',
      magicLinkUrl,
    });
  }
}
