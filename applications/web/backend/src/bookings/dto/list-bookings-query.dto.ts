import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { booking_status } from '../../generated/prisma/enums.js';

// GET /bookings query: filters and paging
export class ListBookingsQueryDto {
  @ApiPropertyOptional({
    enum: booking_status,
    isArray: true,
    example: 'confirmed,completed',
    description: 'One status or a comma-separated list',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value).split(',')).map((s: string) => s.trim()).filter(Boolean))
  @ArrayUnique()
  @IsEnum(booking_status, { each: true })
  status?: booking_status[];

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00Z', description: 'Bookings starting at or after this time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59Z', description: 'Bookings starting before this time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
