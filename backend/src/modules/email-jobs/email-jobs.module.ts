import { Module } from '@nestjs/common';
import { EmailJobsService } from './email-jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  providers: [EmailJobsService],
  exports: [EmailJobsService],
})
export class EmailJobsModule {}
