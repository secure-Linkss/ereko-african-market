import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProductsService } from './products.service';
import { ProductsQueryDto } from './products.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── GET /products ──────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List published products',
    description:
      'Returns a cursor-paginated list of published products. ' +
      'Filters are passed as bracket notation query parameters: ' +
      '`filter[category]`, `filter[origins]`, `filter[storage_types]`, ' +
      '`filter[brands]`, `filter[price_min]`, `filter[price_max]`, `filter[in_stock]`.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20)', type: Number })
  @ApiQuery({ name: 'cursor', required: false, description: 'Opaque pagination cursor from previous response' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['relevance', 'popularity', 'bestsellers', 'newest', 'price_asc', 'price_desc', 'discount'],
    description: 'Sort order (default: relevance)',
  })
  @ApiQuery({ name: 'filter[category]', required: false, description: 'Category ID' })
  @ApiQuery({ name: 'filter[origins]', required: false, description: 'CSV of origin country codes' })
  @ApiQuery({ name: 'filter[storage_types]', required: false, description: 'CSV: ambient,chilled,frozen' })
  @ApiQuery({ name: 'filter[brands]', required: false, description: 'CSV of brand names' })
  @ApiQuery({ name: 'filter[price_min]', required: false, description: 'Minimum price in pence (integer)' })
  @ApiQuery({ name: 'filter[price_max]', required: false, description: 'Maximum price in pence (integer)' })
  @ApiQuery({ name: 'filter[in_stock]', required: false, description: '"true" to show in-stock only' })
  @ApiOkResponse({
    description: 'Paginated product list',
    schema: {
      properties: {
        products: { type: 'array', items: { type: 'object' } },
        nextCursor: { type: 'string', nullable: true },
        totalCount: { type: 'integer' },
      },
    },
  })
  async listProducts(@Query() query: ProductsQueryDto) {
    return this.productsService.listProducts(query);
  }

  // ─── GET /products/:slug ────────────────────────────────────────────────────

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a single published product by slug' })
  @ApiParam({ name: 'slug', description: 'URL-friendly product identifier' })
  @ApiOkResponse({
    description: 'Single product object',
    schema: { type: 'object' },
  })
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getProductBySlug(slug);
  }
}
