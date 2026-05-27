import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({ example: 'SecurePass123!' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password?: string;

  @ApiPropertyOptional({ description: 'Magic link token (alternative to password)' })
  @IsOptional()
  @IsString()
  magicLink?: string;
}

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({ example: 'SecurePass123!' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(128, { message: 'password must not exceed 128 characters' })
  password?: string;

  @ApiProperty({ example: 'Amara' })
  @IsString()
  @MinLength(1, { message: 'firstName is required' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @MinLength(1, { message: 'lastName is required' })
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: '+447700900123' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid E.164 phone number' })
  phone?: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: 'Short-lived MFA JWT returned from login' })
  @IsString()
  mfaToken: string;

  @ApiProperty({ description: '6-digit TOTP code', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(128)
  password: string;

  @ApiProperty({ description: 'Reset token received via email' })
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  // Refresh token comes from httpOnly cookie, nothing in body
}

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
