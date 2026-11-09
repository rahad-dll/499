import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// POST /bookings/:id/check-in: prove the driver is at the lot, by the slot's QR code or by GPS
export class CheckInDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4e5f6', description: 'Code from the QR sticker on the slot' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  qr_code?: string;

  @ApiPropertyOptional({ example: 23.780553, description: 'Phone GPS; used when the slot has no QR code' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 90.4169 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}

// POST /bookings/:id/extend
export class ExtendBookingDto {
  @ApiProperty({ example: 1, description: 'Hours to add; the whole booking stays within 24 hours' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(23)
  extra_hours: number;
}
