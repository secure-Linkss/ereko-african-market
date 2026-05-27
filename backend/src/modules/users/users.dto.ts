import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsPostalCode,
  MaxLength,
  MinLength,
  Matches,
  Length,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Amara' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+447700900123' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid E.164 phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'en-GB' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  preferredLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingEmailOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingSmsOptIn?: boolean;
}

export class CreateAddressDto {
  @ApiProperty({ enum: ['shipping', 'billing', 'both'], default: 'both' })
  @IsEnum(['shipping', 'billing', 'both'], { message: 'type must be shipping, billing, or both' })
  type: 'shipping' | 'billing' | 'both';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: '123 Market Street' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  line1: string;

  @ApiPropertyOptional({ example: 'Flat 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ example: 'London' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Greater London' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiProperty({ example: 'SW1A 1AA' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  postcode: string;

  @ApiProperty({ example: 'GB', default: 'GB' })
  @IsString()
  @Length(2, 2, { message: 'countryCode must be a 2-letter ISO country code' })
  countryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid E.164 phone number' })
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ enum: ['shipping', 'billing', 'both'] })
  @IsOptional()
  @IsEnum(['shipping', 'billing', 'both'])
  type?: 'shipping' | 'billing' | 'both';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  postcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid E.164 phone number' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
