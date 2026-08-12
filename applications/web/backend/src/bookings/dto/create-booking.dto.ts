import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-space' })
  @IsUUID()
  space_id: string;

  @ApiPropertyOptional({
    example: 'uuid-of-slot',
    description: 'Specific slot to book. If omitted, first available slot is auto-selected.',
  })
  @IsOptional()
  @IsUUID()
  slot_id?: string;

  @ApiProperty({ example: '2026-08-11T10:00:00Z' })
  @IsDateString()
  scheduled_at: string;

  @ApiProperty({ example: 2, description: 'Duration in hours' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration_hours: number;

  @ApiPropertyOptional({ example: 'DHK-1234' })
  @IsOptional()
  @IsString()
  vehicle_plate?: string;
}
