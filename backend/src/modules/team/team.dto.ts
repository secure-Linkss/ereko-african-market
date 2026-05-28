import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StaffRole {
  owner = 'owner',
  admin = 'admin',
  fulfillment = 'fulfillment',
  support = 'support',
  marketing = 'marketing',
  viewer = 'viewer',
}

export enum TeamMemberStatus {
  active = 'active',
  invited = 'invited',
  suspended = 'suspended',
}

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'staff@ereko.market' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: StaffRole })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;
}

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;
}

export class SendAdminEmailDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  replyTo?: string;
}
