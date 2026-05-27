import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

const TTL_CATEGORIES = 30 * 60 * 1000; // 30 min

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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Returns the flat list of all active categories (with parentId for hierarchy).
   * The frontend builds the tree from the flat list.
   */
  async getCategoriesTree(): Promise<CategoryResponse[]> {
    const cacheKey = 'categories:flat';
    const cached = await this.cache.get<CategoryResponse[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        parentId: true,
        slug: true,
        name: true,
        position: true,
        description: true,
        image: true,
      },
    });

    const result: CategoryResponse[] = rows.map((r) => {
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
