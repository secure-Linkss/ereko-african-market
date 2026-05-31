import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
