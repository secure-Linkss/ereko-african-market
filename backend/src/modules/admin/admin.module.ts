import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ContactModule } from '../contact/contact.module';
import { CargoModule } from '../cargo/cargo.module';
import { ReviewsModule } from '../reviews/reviews.module';
// InventoryModule is @Global() — InventoryService is available without importing here.
// CacheModule is @Global() — CACHE_MANAGER token is available project-wide.

@Module({
  imports: [
    WebhooksModule,
    ContactModule,
    CargoModule,
    ReviewsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
