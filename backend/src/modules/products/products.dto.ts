import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortBy =
  | 'relevance'
  | 'popularity'
  | 'bestsellers'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'discount';

const SORT_OPTIONS: SortBy[] = [
  'relevance',
  'popularity',
  'bestsellers',
  'newest',
  'price_asc',
  'price_desc',
  'discount',
];

/**
 * Nested filter object.
 * Express/NestJS parse query string bracket notation `filter[category]=x`
 * into `{ filter: { category: 'x' } }` — this class captures that shape.
 */
export class ProductFilterDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Comma-separated list of origin country codes' })
  @IsOptional()
  @IsString()
  origins?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated storage types: ambient,chilled,frozen',
  })
  @IsOptional()
  @IsString()
  storage_types?: string;

  @ApiPropertyOptional({ description: 'Comma-separated brand names' })
  @IsOptional()
  @IsString()
  brands?: string;

  @ApiPropertyOptional({ description: 'Minimum price in pence (inclusive)' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  price_min?: number;

  @ApiPropertyOptional({ description: 'Maximum price in pence (inclusive)' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  price_max?: number;

  @ApiPropertyOptional({ description: 'Pass "true" to return only in-stock products' })
  @IsOptional()
  @IsString()
  in_stock?: string;
}

/**
 * Query DTO for GET /products.
 * class-validator decorators are applied; class-transformer handles conversions.
 */
export class ProductsQueryDto {
  @ApiPropertyOptional({ default: 20, description: 'Page size (max records per page)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    enum: SORT_OPTIONS,
    default: 'relevance',
    description: 'Sort order',
  })
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sortBy?: SortBy = 'relevance';

  @ApiPropertyOptional({ type: () => ProductFilterDto, description: 'Filters object' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductFilterDto)
  filter?: ProductFilterDto;
}

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query (min 2 characters)', minLength: 2 })
  @IsString()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({ description: 'Filter results to a specific category ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ['all', 'products', 'recipes'],
    default: 'all',
    description: 'Scope the search',
  })
  @IsOptional()
  @IsIn(['all', 'products', 'recipes'])
  type?: 'all' | 'products' | 'recipes' = 'all';

  @ApiPropertyOptional({ default: 10, description: 'Maximum results per type' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
