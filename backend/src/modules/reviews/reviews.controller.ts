import { Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './reviews.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get approved store reviews (public)' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Approved reviews list' })
  async getReviews(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getApprovedReviews(Math.min(limit, 50));
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get review stats (avg rating, counts) — public' })
  async getStats() {
    return this.reviewsService.getStats();
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a store review (public — pending admin approval)' })
  @ApiResponse({ status: 201, description: 'Review submitted, pending approval' })
  async createReview(@Body() dto: CreateReviewDto) {
    await this.reviewsService.createReview(dto);
    return { ok: true, message: 'Review submitted — it will appear once approved. Thank you!' };
  }
}
