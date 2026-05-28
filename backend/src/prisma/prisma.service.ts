import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      try {
        await this.$connect();
        this.logger.log('Database connected');
      } catch (err) {
        this.logger.warn(`DB connect skipped (non-fatal): ${err}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
