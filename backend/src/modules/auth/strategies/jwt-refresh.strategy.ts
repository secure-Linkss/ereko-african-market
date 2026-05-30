import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshJwtPayload {
  sub: string;
  family: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const token = req?.cookies?.['refresh_token'];
          if (!token) return null;
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
      algorithms: ['HS256'],
    });
  }

  async validate(req: Request, payload: RefreshJwtPayload) {
    const rawToken = req?.cookies?.['refresh_token'];
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    return {
      userId: payload.sub,
      family: payload.family,
      tokenId: payload.tokenId,
      rawToken,
    };
  }
}
