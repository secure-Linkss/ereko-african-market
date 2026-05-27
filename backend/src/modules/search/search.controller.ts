import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from '../products/products.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Full-text search across products and recipes',
    description:
      'Uses PostgreSQL tsvector to search products (title, brand, descriptionShort, tags) ' +
      'and recipes (title, body). Minimum query length: 2 characters.',
  })
  @ApiQuery({ name: 'q', description: 'Search term (min 2 chars)', required: true })
  @ApiQuery({ name: 'category', description: 'Restrict product results to a category ID', required: false })
  @ApiQuery({
    name: 'type',
    description: 'Scope: "all" | "products" | "recipes"',
    enum: ['all', 'products', 'recipes'],
    required: false,
  })
  @ApiQuery({ name: 'limit', description: 'Max results per type (default 10)', required: false })
  @ApiOkResponse({
    description: 'Search results',
    schema: {
      properties: {
        products: { type: 'array', items: { type: 'object' } },
        recipes: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(
      query.q,
      query.type ?? 'all',
      query.limit ?? 10,
      query.category,
    );
  }
}
