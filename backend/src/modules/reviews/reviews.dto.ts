import { IsString, IsInt, IsEmail, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'Olamide A.', description: 'Display name' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  authorName: string;

  @ApiPropertyOptional({ example: 'shopper@example.com' })
  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great selection of authentic African foods!' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewSource = 'site' | 'google';
