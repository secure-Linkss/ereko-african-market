import { Global, Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Global so CartModule, CheckoutModule, OrdersModule, and AdminModule
 * can inject InventoryService without re-importing this module.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
