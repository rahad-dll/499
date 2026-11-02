import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsString, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleKind } from './slot.dto';

export enum CameraSource {
  rtsp  = 'rtsp',
  video = 'video',
}

// Rectangle in frame pixels, origin top-left; decimals allowed
export class PixelBoxDto {
  @ApiProperty({ example: 302.5 }) @IsNumber() @Min(0) x: number;
  @ApiProperty({ example: 579 }) @IsNumber() @Min(0) y: number;
  @ApiProperty({ example: 215 }) @IsNumber() @Min(0.5) width: number;
  @ApiProperty({ example: 133 }) @IsNumber() @Min(0.5) height: number;
}

export class CameraSlotDto {
  @ApiProperty({ example: 'A01', description: 'Unique in the whole lot; stored in upper case' })
  @IsString() @Matches(/^[A-Za-z0-9-]{1,20}$/, { message: 'slot_label must be 1-20 letters, digits or "-"' })
  slot_label: string;

  @ApiProperty({ enum: VehicleKind, example: VehicleKind.car })
  @IsEnum(VehicleKind)
  vehicle_type: VehicleKind;

  @ApiPropertyOptional({
    example: 5000,
    description: "Own hourly price in paisa; omit to use the lot's rate for this vehicle type",
  })
  @IsOptional() @IsInt() @Min(1) @Max(10_000_000)
  hourly_rate_unit?: number;

  @ApiProperty({ type: PixelBoxDto })
  @ValidateNested() @Type(() => PixelBoxDto)
  bbox: PixelBoxDto;
}

export class CreateCameraDto {
  @ApiProperty({ example: 'Camera 1' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  label: string;

  @ApiProperty({ enum: CameraSource, example: CameraSource.video })
  @IsEnum(CameraSource)
  source_type: CameraSource;

  @ApiPropertyOptional({ example: 'rtsp://192.168.1.100:554/stream1', description: 'Required for rtsp cameras' })
  @IsOptional() @IsString() @MaxLength(500)
  rtsp_url?: string | null;

  @ApiProperty({ example: 1920, description: 'Pixel size of the footage the boxes are drawn on' })
  @IsInt() @Min(1) @Max(16384)
  frame_width: number;

  @ApiProperty({ example: 1080 })
  @IsInt() @Min(1) @Max(16384)
  frame_height: number;

  @ApiPropertyOptional({ type: [CameraSlotDto], description: 'Slots seen by this camera; can also be added later' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => CameraSlotDto)
  slots?: CameraSlotDto[];
}
