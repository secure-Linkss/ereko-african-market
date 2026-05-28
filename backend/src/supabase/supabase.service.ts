import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = config.get<string>('supabase.url') || process.env.SUPABASE_URL || '';
    const key = config.get<string>('supabase.serviceKey') || process.env.SUPABASE_SERVICE_KEY || '';

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.logger.log(`SupabaseService initialized (url=${url ? 'set' : 'missing'})`);
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
