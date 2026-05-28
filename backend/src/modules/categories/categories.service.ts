import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SupabaseService } from '../../supabase/supabase.service';

const TTL_CATEGORIES = 30 * 60 * 1000;

export interface CategoryResponse {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  position: number;
  description?: string;
  image?: string;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getCategoriesTree(): Promise<CategoryResponse[]> {
    const cacheKey = 'categories:flat';
    const cached = await this.cache.get<CategoryResponse[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase.db
      .from('Category')
      .select('id, parentId, slug, name, position, description, image')
      .eq('isActive', true)
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch categories: ${error.message}`);
      return [];
    }

    const result: CategoryResponse[] = (data ?? []).map((r: any) => {
      const cat: CategoryResponse = {
        id: r.id,
        parentId: r.parentId,
        slug: r.slug,
        name: r.name,
        position: r.position,
      };
      if (r.description != null) cat.description = r.description;
      if (r.image != null) cat.image = r.image;
      return cat;
    });

    await this.cache.set(cacheKey, result, TTL_CATEGORIES);
    return result;
  }
}
