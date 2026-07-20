import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SpaceType } from './create-space.dto';

export class UpdateSpaceDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsUUID() area_id?: string;
  @IsOptional() @IsString() @MaxLength(20) contact_phone?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) @Type(() => Number) longitude?: number;
  @IsOptional() @IsEnum(SpaceType) space_type?: SpaceType;
  @IsOptional() @IsInt() @Min(1) @Max(10000) @Type(() => Number) total_capacity?: number;
  @IsOptional() @IsObject() operating_hours?: Record<string, { open: string; close: string }>;
  @IsOptional() @IsString({ each: true }) amenities?: string[];
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) base_rate_unit?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) max_height_cm?: number;
  @IsOptional() @IsString() @MaxLength(500) rtsp_url?: string;
}
