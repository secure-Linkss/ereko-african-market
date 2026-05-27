import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
// InventoryModule is @Global() — InventoryService is available without importing here.
// CacheModule is @Global() — CACHE_MANAGER token is available project-wide.

@Module({
  imports: [
    PrismaModule,
    WebhooksModule, // provides WebhooksService for order event dispatch
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
