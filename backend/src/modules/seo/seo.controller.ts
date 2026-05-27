import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SeoService } from './seo.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UpsertSeoDto {
  @ApiProperty() @IsString() metaTitle: string;
  @ApiProperty() @IsString() metaDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ogTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ogDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ogImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() canonicalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() structuredData?: object;
}

@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Public()
  @ApiOperation({ summary: 'XML sitemap for Google Search Console' })
  async getSitemap(@Req() req: Request, @Res() res: Response) {
    const baseUrl = process.env.FRONTEND_URL || 'https://ereko.market';
    const xml = await this.seoService.generateSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }

  @Get('robots.txt')
  @Public()
  @ApiOperation({ summary: 'Robots.txt' })
  getRobots(@Res() res: Response) {
    const sitemapUrl = `${process.env.FRONTEND_URL || 'https://ereko.market'}/api/v1/sitemap.xml`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/v1/admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /cart

Sitemap: ${sitemapUrl}`);
  }

  @Get('seo/schema/organization')
  @Public()
  @ApiOperation({ summary: 'JSON-LD Organization schema' })
  getOrgSchema(@Req() req: Request) {
    const baseUrl = process.env.FRONTEND_URL || 'https://ereko.market';
    return this.seoService.getOrganizationSchema(baseUrl);
  }

  @Get('seo/config/:pageKey')
  @Public()
  @ApiOperation({ summary: 'Get SEO config for a page' })
  getSeoConfig(@Param('pageKey') pageKey: string) {
    return this.seoService.getSeoConfig(pageKey);
  }

  @Put('admin/seo/config/:pageKey')
  @UseGuards(AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update SEO config for a page (admin)' })
  upsertSeoConfig(
    @Param('pageKey') pageKey: string,
    @Body() dto: UpsertSeoDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.seoService.upsertSeoConfig(pageKey, dto, actorId);
  }
}
