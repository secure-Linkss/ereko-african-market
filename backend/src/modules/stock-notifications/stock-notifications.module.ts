import { Module } from '@nestjs/common';
import { StockNotificationsController } from './stock-notifications.controller';
import { StockNotificationsService } from './stock-notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [StockNotificationsController],
  providers: [StockNotificationsService],
  exports: [StockNotificationsService],
})
export class StockNotificationsModule {}
