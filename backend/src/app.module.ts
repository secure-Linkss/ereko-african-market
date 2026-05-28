import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SearchModule } from './modules/search/search.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { CargoModule } from './modules/cargo/cargo.module';
import { AdminModule } from './modules/admin/admin.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { TeamModule } from './modules/team/team.module';
import { SeoModule } from './modules/seo/seo.module';
import { ContactModule } from './modules/contact/contact.module';

const hasRedis = (): boolean =>
  !!(process.env.REDIS_URL || process.env.REDIS_HOST);

function buildCacheModule(): DynamicModule {
  if (hasRedis()) {
    return CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore as any,
        host: config.get<string>('redis.host') ?? 'localhost',
        port: config.get<number>('redis.port') ?? 6379,
        password: config.get<string>('redis.password'),
        db: config.get<number>('redis.db') ?? 0,
        ttl: 300,
      }),
    });
  }
  return CacheModule.register({ isGlobal: true, ttl: 300 });
}

function buildBullModule(): DynamicModule[] {
  if (!hasRedis()) return [];
  return [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          db: config.get<number>('redis.db'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') ?? 60000,
            limit: config.get<number>('throttle.limit') ?? 100,
          },
        ],
      }),
    }),

    buildCacheModule(),
    ...buildBullModule(),

    EventEmitterModule.forRoot({ wildcard: true }),
    ScheduleModule.forRoot(),

    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    SearchModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    RecipesModule,
    CargoModule,
    AdminModule,
    InventoryModule,
    NotificationsModule,
    WebhooksModule,
    TeamModule,
    SeoModule,
    ContactModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
