import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum RegisterRole {
  driver    = 'driver',
  owner     = 'owner',
  authority = 'authority',
}

export enum LicenceType {
  A = 'A', B = 'B', C = 'C', D = 'D', E = 'E',
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

  // shared
  @IsOptional() @IsString() @MaxLength(255)
  full_name?: string;

  @IsOptional() @IsUUID()
  area_id?: string;

  // driver
  @IsOptional() @IsDateString()
  date_of_birth?: string;

  @IsOptional() @IsString() @MaxLength(50)
  driving_licence_no?: string;

  @IsOptional() @IsEnum(LicenceType)
  licence_type?: LicenceType;

  // owner
  @IsOptional() @IsString() @MaxLength(255)
  business_name?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString() @MaxLength(50)
  national_id?: string;

  @IsOptional() @IsString() @MaxLength(50)
  passport_no?: string;

  // authority
  @IsOptional() @IsString() @MaxLength(255)
  organization?: string;

  @IsOptional() @IsString() @MaxLength(50)
  badge_number?: string;
}
