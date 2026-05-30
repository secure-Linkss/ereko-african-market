import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../supabase/supabase.service';

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
    private readonly supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, firstName, lastName, phone, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, isAdmin, isSuperAdmin, isActive, deletedAt')
      .eq('id', payload.sub)
      .limit(1);

    const user = users?.[0];
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or does not exist');
    }

    const { data: teamRows } = await this.supabase.db
      .from('TeamMember')
      .select('role, status')
      .eq('userId', user.id)
      .limit(1);

    const team = teamRows?.[0];

    return {
      ...user,
      teamRole: team?.role ?? null,
      teamStatus: team?.status ?? null,
    };
  }
}
