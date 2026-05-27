import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

/**
 * CacheModule is registered globally in AppModule (Redis-backed).
 * RecipesService injects CACHE_MANAGER directly via that global registration.
 */
@Module({
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
