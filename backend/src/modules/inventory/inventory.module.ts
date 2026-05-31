import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryService } from './inventory.service';

@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
