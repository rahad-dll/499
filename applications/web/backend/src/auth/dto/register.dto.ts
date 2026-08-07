import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum RegisterRole {
  driver = 'driver',
  owner = 'owner',
  authority = 'authority',
}

export enum LicenceType {
  professional = 'professional',
  non_professional = 'non_professional',
}

export class RegisterDto {
  @ApiProperty({ example: 'owner@citypulse.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '01712345678' })
  @IsMobilePhone('bn-BD')
  phone: string;

  @ApiProperty({ enum: RegisterRole, example: RegisterRole.driver })
  @IsEnum(RegisterRole)
  role: RegisterRole;

  @ApiPropertyOptional({ example: 'Rahad Hossain' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @ApiPropertyOptional({ example: '5b9d68c2-bccd-43c9-82b0-148b47a52aff' })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  // driver fields
  @ApiPropertyOptional({ example: '2000-06-15' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 'DL-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  driving_licence_no?: string;

  @ApiPropertyOptional({ enum: LicenceType, example: LicenceType.professional })
  @IsOptional()
  @IsEnum(LicenceType)
  licence_type?: LicenceType;

  // owner fields
  @ApiPropertyOptional({ example: 'Gulshan Parking Ltd.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  business_name?: string;

  @ApiPropertyOptional({ example: 'House 12, Road 5, Gulshan' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  national_id?: string;

  @ApiPropertyOptional({ example: 'P-98765432' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passport_no?: string;

  // authority fields
  @ApiPropertyOptional({ example: 'Dhaka Metropolitan Police' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  organization?: string;

  @ApiPropertyOptional({ example: 'DMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badge_number?: string;
}
