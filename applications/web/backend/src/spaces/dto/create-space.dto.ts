import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject,
  IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SpaceType {
  indoor   = 'indoor',
  outdoor  = 'outdoor',
  rooftop  = 'rooftop',
}

export class CreateSpaceDto {
  @ApiProperty({ example: 'Gulshan Parking Zone A' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Covered parking near Gulshan-1 circle' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'House 12, Road 5, Gulshan-1' })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'uuid-of-area' })
  @IsOptional() @IsUUID()
  area_id?: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsOptional() @IsString() @MaxLength(20)
  contact_phone?: string;

  @ApiProperty({ example: 23.7937 })
  @IsNumber() @Min(-90) @Max(90) @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 90.4066 })
  @IsNumber() @Min(-180) @Max(180) @Type(() => Number)
  longitude: number;

  @ApiProperty({ enum: SpaceType, example: SpaceType.outdoor })
  @IsEnum(SpaceType)
  space_type: SpaceType;

  @ApiProperty({ example: 50 })
  @IsInt() @Min(1) @Max(10000) @Type(() => Number)
  total_capacity: number;

  @ApiPropertyOptional({
    example: { mon: { open: '08:00', close: '22:00' }, fri: { open: '08:00', close: '23:00' } },
  })
  @IsOptional() @IsObject()
  operating_hours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ example: ['cctv', 'covered', 'security_guard'] })
  @IsOptional() @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: 5000, description: 'Rate per hour in BDT paisa (5000 = 50 BDT)' })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  base_rate_unit?: number;

  @ApiPropertyOptional({ example: 210, description: 'Maximum vehicle height in cm' })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  max_height_cm?: number;

  @ApiPropertyOptional({ example: 'rtsp://192.168.1.100:554/stream1' })
  @IsOptional() @IsString() @MaxLength(500)
  rtsp_url?: string;
}
