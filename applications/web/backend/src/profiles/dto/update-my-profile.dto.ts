import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { licence_type, vehicle_class } from '../../generated/prisma/enums.js';

// Fields each role may change; sending another role's field answers 400.
export const ROLE_FIELDS = {
  owner: ['business_name', 'address'],
  driver: ['driving_licence_no', 'licence_type', 'date_of_birth', 'vehicle_classes'],
  authority: ['organization', 'badge_number'],
} as const;

export class UpdateMyProfileDto {
  // ── every role

  @ApiPropertyOptional({ example: 'Rahim Uddin' })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  full_name?: string;

  @ApiPropertyOptional({ example: '01712345678', description: 'Bangladeshi mobile number; changing it marks the phone as not verified' })
  @IsOptional() @Matches(/^01[3-9]\d{8}$/, { message: 'phone must be a Bangladeshi mobile number (01XXXXXXXXX)' })
  phone?: string;

  @ApiPropertyOptional({ example: '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f', description: 'Area id from the location lists' })
  @IsOptional() @IsUUID()
  area_id?: string;

  // ── owner

  @ApiPropertyOptional({ example: 'Gulshan Parking Ltd', nullable: true, description: 'Owner only' })
  @IsOptional() @IsString() @MaxLength(255)
  business_name?: string | null;

  @ApiPropertyOptional({ example: 'House 12, Road 5, Gulshan 1, Dhaka', nullable: true, description: 'Owner only' })
  @IsOptional() @IsString() @MaxLength(500)
  address?: string | null;

  // ── driver

  @ApiPropertyOptional({ example: 'DK0123456789', nullable: true, description: 'Driver only' })
  @IsOptional() @IsString() @MaxLength(50)
  driving_licence_no?: string | null;

  @ApiPropertyOptional({ enum: licence_type, nullable: true, description: 'Driver only' })
  @IsOptional() @IsEnum(licence_type)
  licence_type?: licence_type | null;

  @ApiPropertyOptional({ example: '1995-04-21', nullable: true, description: 'Driver only, YYYY-MM-DD' })
  @IsOptional() @IsDateString({ strict: true })
  date_of_birth?: string | null;

  @ApiPropertyOptional({ enum: vehicle_class, isArray: true, example: ['L', 'C'], description: 'Driver only; BRTA licence classes' })
  @IsOptional() @IsArray() @ArrayUnique() @IsEnum(vehicle_class, { each: true })
  vehicle_classes?: vehicle_class[];

  // ── authority

  @ApiPropertyOptional({ example: 'DMP Traffic Division', nullable: true, description: 'Authority only' })
  @IsOptional() @IsString() @MaxLength(255)
  organization?: string | null;

  @ApiPropertyOptional({ example: 'DMP-4521', nullable: true, description: 'Authority only' })
  @IsOptional() @IsString() @MaxLength(50)
  badge_number?: string | null;
}
