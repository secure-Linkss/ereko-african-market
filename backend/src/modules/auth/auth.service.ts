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
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoginDto, SignupDto, MfaVerifyDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { LoyaltyTier } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Rate Limiting (Redis-backed — works across multiple instances) ─────────

  private async checkRateLimit(key: string): Promise<void> {
    const cacheKey = `auth:rl:${key}`;
    const current = await this.cache.get<number>(cacheKey) ?? 0;

    if (current >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException('Too many login attempts. Please wait 1 minute before trying again.');
    }

    await this.cache.set(cacheKey, current + 1, LOGIN_WINDOW_SECONDS);
  }

  private async clearRateLimit(key: string): Promise<void> {
    await this.cache.del(`auth:rl:${key}`);
  }

  // ─── Token Helpers ────────────────────────────────────────────────────────

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

  private async issueRefreshToken(
    userId: string,
    family: string,
    req: Request,
  ): Promise<string> {
    const tokenId = uuidv4();
    const rawToken = uuidv4() + '.' + uuidv4();
    const tokenHash = this.hashToken(rawToken);

    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
    const expiresAt = new Date(Date.now() + this.parseExpiry(expiresIn));

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        family,
        expiresAt,
        userAgent: req.headers['user-agent']?.slice(0, 512) ?? null,
        ipAddress: this.extractIp(req),
      },
    });

    return rawToken;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
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
      loyaltyTier: (user.loyalty?.tier ?? 'Member') as LoyaltyTier,
      loyaltyPointsBalance: user.loyalty?.pointsBalance ?? 0,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, req: Request, res: Response) {
    const rateLimitKey = `login:${dto.email}`;
    this.checkRateLimit(rateLimitKey);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { mfaCredential: true, loyalty: true },
    });

    // Magic link login
    if (dto.magicLink) {
      return this.loginWithMagicLink(dto.magicLink, req, res);
    }

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

    this.clearRateLimit(rateLimitKey);

    // Check MFA
    if (user.mfaCredential?.enabled) {
      const mfaToken = await this.issueMfaToken(user.id);
      return { mfaRequired: true, mfaToken };
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return {
      accessToken,
      user: this.formatUserProfile(user),
    };
  }

  private async loginWithMagicLink(token: string, req: Request, res: Response) {
    const tokenHash = this.hashToken(token);
    const magicLink = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link is invalid or has expired');
    }

    await this.prisma.magicLinkToken.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: magicLink.email },
      include: { loyalty: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account not found or inactive');
    }

    if (!user.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return {
      accessToken,
      user: this.formatUserProfile(user),
    };
  }

  // ─── Signup ───────────────────────────────────────────────────────────────

  async signup(dto: SignupDto, req: Request, res: Response) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
        },
      });

      await tx.loyaltyAccount.create({
        data: {
          userId: newUser.id,
          pointsBalance: 0,
          tier: LoyaltyTier.Member,
          totalEarned: 0,
          totalRedeemed: 0,
        },
      });

      return newUser;
    });

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { loyalty: true },
    });

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    return this.formatUserProfile(fullUser);
  }

  // ─── MFA Verify ───────────────────────────────────────────────────────────

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
    const mfaCredential = await this.prisma.mfaCredential.findUnique({
      where: { userId },
    });

    if (!mfaCredential || !mfaCredential.enabled) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    const isValid = authenticator.verify({
      token: dto.code,
      secret: mfaCredential.secret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { loyalty: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account not found or inactive');
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);
    const family = uuidv4();
    const rawRefreshToken = await this.issueRefreshToken(user.id, family, req);
    this.setRefreshCookie(res, rawRefreshToken);

    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    return {
      accessToken,
      refreshToken: 'httpOnly cookie',
      user: this.formatUserProfile(user),
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive || user.deletedAt) {
      return;
    }

    // Invalidate existing tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = uuidv4() + '-' + uuidv4();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>('frontend.url');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.notificationsService.sendPasswordReset({
      email: user.email,
      firstName: user.firstName ?? 'Customer',
      resetUrl,
    });
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      !resetToken.user.isActive ||
      resetToken.user.deletedAt
    ) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens on password reset
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refresh(
    userId: string,
    family: string,
    rawToken: string,
    req: Request,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      // Token not found — possible theft: revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    if (existingToken.revokedAt) {
      // Reuse of revoked token — revoke entire family (theft detection)
      await this.prisma.refreshToken.updateMany({
        where: { family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    if (existingToken.expiresAt < new Date()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!existingToken.user.isActive || existingToken.user.deletedAt) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('User account is inactive');
    }

    // Rotate: revoke old token, issue new one in same family
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    const newRawToken = await this.issueRefreshToken(existingToken.userId, family, req);
    this.setRefreshCookie(res, newRawToken);

    const accessToken = await this.issueAccessToken(
      existingToken.userId,
      existingToken.user.email,
    );

    return { accessToken };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(rawToken: string | undefined, res: Response): Promise<void> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.refreshToken
        .update({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        })
        .catch(() => {
          // Token not found — already revoked or expired, that's fine
        });
    }
    this.clearRefreshCookie(res);
  }

  // ─── Magic Link Send ──────────────────────────────────────────────────────

  async sendMagicLink(email: string): Promise<void> {
    // Create user if not exists (passwordless signup)
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({ data: { email } });
        await tx.loyaltyAccount.create({
          data: {
            userId: newUser.id,
            pointsBalance: 0,
            tier: LoyaltyTier.Member,
          },
        });
        return newUser;
      });
    }

    if (!user.isActive || user.deletedAt) {
      return; // Silently fail
    }

    // Invalidate old magic link tokens for this email
    const old = await this.prisma.magicLinkToken.findMany({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (old.length > 0) {
      await this.prisma.magicLinkToken.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });
    }

    const rawToken = uuidv4() + '-' + uuidv4();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.magicLinkToken.create({
      data: { email, tokenHash, expiresAt },
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
