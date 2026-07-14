import { IsEmail, IsEnum, IsMobilePhone, IsOptional, IsString, MinLength } from 'class-validator';

export enum RegisterRole {
  driver = 'driver',
  owner = 'owner',
  authority = 'authority',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsMobilePhone('bn-BD')
  phone: string;

  @IsEnum(RegisterRole)
  role: RegisterRole;

  // driver profile
  @IsOptional()
  @IsString()
  full_name?: string;

  // owner profile
  @IsOptional()
  @IsString()
  business_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // authority profile
  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  badge_number?: string;
}
