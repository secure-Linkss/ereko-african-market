import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never throws — user will be null/undefined for
 * anonymous requests. Used for endpoints that work for both authenticated
 * and anonymous users (cart, public product pages, etc.)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    // Do NOT throw — just return null for unauthenticated requests
    return user || null;
  }
}
