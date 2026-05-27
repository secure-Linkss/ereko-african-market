import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all active categories',
    description:
      'Returns a flat list of all active categories. The `parentId` field allows the client to build a tree.',
  })
  @ApiOkResponse({
    description: 'Flat array of Category objects',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          slug: { type: 'string' },
          name: { type: 'string' },
          position: { type: 'integer' },
          description: { type: 'string' },
          image: { type: 'string' },
        },
      },
    },
  })
  async getCategories() {
    return this.categoriesService.getCategoriesTree();
  }
}
