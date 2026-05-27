import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLocale: true,
        marketingEmailOptIn: true,
        marketingSmsOptIn: true,
        isAdmin: true,
        isSuperAdmin: true,
        isActive: true,
        deletedAt: true,
        teamMembership: { select: { role: true, status: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or does not exist');
    }

    return {
      ...user,
      teamRole: user.teamMembership?.role ?? null,
      teamStatus: user.teamMembership?.status ?? null,
    };
  }
}
