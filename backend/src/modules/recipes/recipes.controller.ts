import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RecipesService } from './recipes.service';
import { ListRecipesQueryDto } from './recipes.dto';

@ApiTags('Recipes')
@Public()
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @ApiOperation({ summary: 'List published recipes' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Array of recipes' })
  async listRecipes(@Query() query: ListRecipesQueryDto) {
    return this.recipesService.listRecipes(query.limit ?? 10);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single recipe by slug' })
  @ApiParam({ name: 'slug', description: 'Recipe URL slug', example: 'jollof-rice-with-chicken' })
  @ApiResponse({ status: 200, description: 'Recipe detail' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async getRecipe(@Param('slug') slug: string) {
    return this.recipesService.getRecipeBySlug(slug);
  }
}
