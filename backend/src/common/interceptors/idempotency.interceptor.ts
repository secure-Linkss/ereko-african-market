import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Idempotency interceptor — reads Idempotency-Key header, checks Redis cache,
 * stores successful response for 24 hours.
 *
 * Apply at controller or handler level with @UseInterceptors(IdempotencyInterceptor).
 * Only applies to POST / PUT / PATCH requests that supply the header.
 */

// cache-manager v5 uses milliseconds
const IDEMPOTENCY_TTL_MS = 86400 * 1000; // 24 hours
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method?.toUpperCase() ?? '';

    // Only apply idempotency to mutating HTTP methods
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey: string | undefined = req.headers[IDEMPOTENCY_KEY_HEADER];
    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;

    // ── Check cache ──────────────────────────────────────────────────────────
    try {
      const cached = await this.cache.get<{ statusCode: number; body: unknown }>(cacheKey);
      if (cached !== undefined && cached !== null) {
        this.logger.debug(`Idempotency hit for key=${idempotencyKey}`);
        const res = context.switchToHttp().getResponse();
        res.status(cached.statusCode);
        return of(cached.body);
      }
    } catch (err) {
      this.logger.warn(`Idempotency cache read error: ${(err as Error).message} — proceeding without cache`);
    }

    // ── Process and cache response ───────────────────────────────────────────
    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            const res = context.switchToHttp().getResponse();
            await this.cache.set(
              cacheKey,
              { statusCode: res.statusCode, body: data },
              IDEMPOTENCY_TTL_MS,
            );
            this.logger.debug(`Idempotency stored for key=${idempotencyKey}`);
          } catch (err) {
            this.logger.warn(`Idempotency cache write error: ${(err as Error).message}`);
          }
        },
        error: () => {
          // Never cache error responses — next retry must re-process
        },
      }),
    );
  }
}
