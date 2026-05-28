import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Amara Osei' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Order enquiry' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'I have a question about my order...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ example: '+44 7911 123456' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
