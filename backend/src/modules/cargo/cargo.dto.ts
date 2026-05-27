import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export enum CargoUrgencyDto {
  standard = 'standard',
  express = 'express',
  super_express = 'super-express',
}

export class CargoInquireDto {
  @ApiProperty({ example: 'Amara Okafor' })
  @IsString()
  @MaxLength(200)
  senderName: string;

  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail()
  senderEmail: string;

  @ApiProperty({ example: '+447700900123' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'senderPhone must be a valid phone number' })
  senderPhone: string;

  @ApiProperty({ example: 'Chukwuemeka Adeyemi' })
  @IsString()
  @MaxLength(200)
  recipientName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'recipientPhone must be a valid phone number' })
  recipientPhone: string;

  @ApiProperty({ example: '12 Adeola Odeku Street, Victoria Island' })
  @IsString()
  @MaxLength(500)
  recipientAddress: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @MaxLength(100)
  recipientCity: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @MaxLength(100)
  recipientCountry: string;

  @ApiProperty({ description: 'Estimated weight in kilograms', example: 10 })
  @IsNumber()
  @IsPositive()
  weightEstKg: number;

  @ApiPropertyOptional({ description: 'Estimated volume in cubic metres', example: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeEstCbm?: number;

  @ApiProperty({ example: 'Dried stockfish, palm oil, African spices' })
  @IsString()
  @MaxLength(1000)
  itemDescription: string;

  @ApiProperty({ enum: CargoUrgencyDto, example: 'standard' })
  @IsEnum(CargoUrgencyDto)
  urgency: CargoUrgencyDto;
}

export class CargoEstimateDto {
  @ApiProperty({ description: 'Weight in kilograms', example: 10 })
  @IsNumber()
  @IsPositive()
  weightKg: number;

  @ApiPropertyOptional({ description: 'Volume in cubic metres', example: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeCbm?: number;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @MaxLength(100)
  destinationCountry: string;

  @ApiProperty({ enum: CargoUrgencyDto, example: 'standard' })
  @IsEnum(CargoUrgencyDto)
  urgency: CargoUrgencyDto;
}
