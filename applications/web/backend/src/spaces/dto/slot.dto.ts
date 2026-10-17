import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt,
  IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength,
  Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SlotType {
  standard   = 'standard',
  compact    = 'compact',
  large      = 'large',
  motorcycle = 'motorcycle',
  disabled   = 'disabled',
  ev         = 'ev',
  bicycle    = 'bicycle',
}

export enum SlotStatus {
  active      = 'active',
  inactive    = 'inactive',
  maintenance = 'maintenance',
  blocked     = 'blocked',
}

export enum VehicleKind {
  car        = 'car',
  motorcycle = 'motorcycle',
  cng        = 'cng',
  microbus   = 'microbus',
  suv        = 'suv',
  pickup     = 'pickup',
}

// Box in the camera frame, normalised to 0-1 so it survives resolution changes
export class SlotBboxDto {
  @ApiProperty({ example: 0.12 }) @IsNumber() @Min(0) @Max(1) x1: number;
  @ApiProperty({ example: 0.40 }) @IsNumber() @Min(0) @Max(1) y1: number;
  @ApiProperty({ example: 0.25 }) @IsNumber() @Min(0) @Max(1) x2: number;
  @ApiProperty({ example: 0.78 }) @IsNumber() @Min(0) @Max(1) y2: number;
}

export class CreateSlotDto {
  @ApiProperty({ example: 'A-12' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  slot_label: string;

  @ApiPropertyOptional({ example: 'Near lift' })
  @IsOptional() @IsString() @MaxLength(100)
  display_name?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional() @IsString() @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional({ example: 'B1' })
  @IsOptional() @IsString() @MaxLength(20)
  floor?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional() @IsInt() @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ enum: SlotType, example: SlotType.standard })
  @IsOptional() @IsEnum(SlotType)
  slot_type?: SlotType;

  @ApiPropertyOptional({ enum: VehicleKind, isArray: true, example: ['car', 'suv'] })
  @IsOptional() @IsArray() @IsEnum(VehicleKind, { each: true })
  vehicle_types?: VehicleKind[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsInt() @Min(0)
  length_cm?: number;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional() @IsInt() @Min(0)
  width_cm?: number;

  @ApiPropertyOptional({ example: 210 })
  @IsOptional() @IsInt() @Min(0)
  max_height_cm?: number;

  @ApiPropertyOptional({ example: ['covered', 'near_exit'] })
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(50, { each: true })
  features?: string[];

  @ApiPropertyOptional({ example: 7.4 })
  @IsOptional() @IsNumber() @Min(0)
  ev_charger_kw?: number;

  @ApiPropertyOptional({ description: 'Camera that sees this slot' })
  @IsOptional() @IsUUID()
  camera_id?: string;

  @ApiPropertyOptional({ type: SlotBboxDto })
  @IsOptional() @ValidateNested() @Type(() => SlotBboxDto)
  bbox?: SlotBboxDto;

  @ApiPropertyOptional({ example: [[0.12, 0.40], [0.25, 0.40], [0.25, 0.78], [0.12, 0.78]] })
  @IsOptional() @IsArray() @ArrayMinSize(3) @ArrayMaxSize(50)
  mask_polygon?: number[][];

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  allow_hourly?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  allow_daily?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  allow_monthly?: boolean;

  @ApiPropertyOptional({ example: true, description: 'False for walk-in only slots' })
  @IsOptional() @IsBoolean()
  is_bookable?: boolean;

  @ApiPropertyOptional({ enum: SlotStatus, example: SlotStatus.active })
  @IsOptional() @IsEnum(SlotStatus)
  status?: SlotStatus;

  @ApiPropertyOptional({ example: 'Enter through gate 2' })
  @IsOptional() @IsString() @MaxLength(500)
  access_note?: string;

  @ApiPropertyOptional({ description: 'Driver profile with a fixed (monthly) slot' })
  @IsOptional() @IsUUID()
  assigned_driver_id?: string;

  @ApiPropertyOptional({ description: 'Generated automatically when omitted' })
  @IsOptional() @IsString() @MaxLength(64)
  qr_code?: string;

  @ApiPropertyOptional({ example: 'spaces/slot-a12.jpg' })
  @IsOptional() @IsString() @MaxLength(500)
  cover_photo_key?: string;
}

export class UpdateSlotDto extends PartialType(CreateSlotDto) {}

// Settings shared by every slot made in one bulk request
export class SlotDefaultsDto extends PartialType(
  OmitType(CreateSlotDto, ['slot_label', 'display_name', 'qr_code', 'bbox', 'mask_polygon', 'sort_order'] as const),
) {}

export class BulkCreateSlotsDto {
  @ApiProperty({ example: 'A-', description: 'Label prefix' })
  @IsString() @MaxLength(15)
  prefix: string;

  @ApiProperty({ example: 50 })
  @IsInt() @Min(1) @Max(1000)
  count: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Min(0)
  start?: number;

  @ApiPropertyOptional({ example: 2, description: 'Zero-pad numbers to this width (2 gives A-01)' })
  @IsOptional() @IsInt() @Min(0) @Max(5)
  pad?: number;

  @ApiPropertyOptional({ type: SlotDefaultsDto })
  @IsOptional() @ValidateNested() @Type(() => SlotDefaultsDto)
  defaults?: SlotDefaultsDto;
}

export class BulkUpdateSlotsDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @IsUUID('all', { each: true })
  slot_ids: string[];

  @ApiProperty({ type: SlotDefaultsDto })
  @ValidateNested() @Type(() => SlotDefaultsDto)
  changes: SlotDefaultsDto;
}

export class ListSlotsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  floor?: string;

  @ApiPropertyOptional({ enum: SlotType }) @IsOptional() @IsEnum(SlotType)
  slot_type?: SlotType;

  @ApiPropertyOptional({ enum: SlotStatus }) @IsOptional() @IsEnum(SlotStatus)
  status?: SlotStatus;

  @ApiPropertyOptional({ enum: VehicleKind }) @IsOptional() @IsEnum(VehicleKind)
  vehicle_type?: VehicleKind;

  @ApiPropertyOptional({ description: 'With "to": only slots with no booking in this period' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  to?: string;
}

export class UpdateSpaceStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'pending'], example: 'active' })
  @Matches(/^(active|inactive|pending)$/)
  status: 'active' | 'inactive' | 'pending';
}
