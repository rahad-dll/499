import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SpaceType {
  indoor = 'indoor',
  outdoor = 'outdoor',
  rooftop = 'rooftop',
}

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  thana?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contact_phone?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsEnum(SpaceType)
  space_type: SpaceType;

  @IsInt()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  total_capacity: number;

  @IsOptional()
  @IsObject()
  operating_hours?: Record<string, { open: string; close: string }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  base_rate_unit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  max_height_cm?: number;

  // RTSP stream URL for camera feed — optional at registration
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rtsp_url?: string;
}
