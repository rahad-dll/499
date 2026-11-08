import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleKind } from './slot.dto';

// Response shapes of GET /spaces/:id for drivers (documentation only)

export class VehicleRateDto {
  @ApiProperty({ enum: VehicleKind, example: VehicleKind.car }) vehicle_type: VehicleKind;
  @ApiProperty({ example: 5000, description: 'Hourly price in paisa (5000 = 50 BDT)' }) hourly_rate_unit: number;
}

export class SpacePhotoLinkDto {
  @ApiProperty({ example: '7b1d0c3e-2f4a-4c55-9a51-0d6c8e2f1a90' }) id: string;
  @ApiProperty({ example: true }) is_primary: boolean;
  @ApiProperty({ example: 'https://storage.example.com/photos/front.jpg?X-Amz-Signature=...', description: 'Signed link, valid 15 minutes' })
  url: string;
}

export class SpacePublicDto {
  @ApiProperty({ example: '6f1c2a9e-4b7d-4e2a-9c1f-3a5b7d9e1f20' }) id: string;
  @ApiProperty({ example: 'Gulshan Parking Zone A' }) name: string;
  @ApiPropertyOptional({ example: 'Covered parking next to Gulshan 1 circle' }) description: string | null;
  @ApiPropertyOptional({ example: 'Gulshan 1, Dhaka' }) address: string | null;
  @ApiPropertyOptional({ example: '01700000000' }) contact_phone: string | null;
  @ApiProperty({ example: 23.780553 }) latitude: number;
  @ApiProperty({ example: 90.4169 }) longitude: number;
  @ApiProperty({ example: 'indoor' }) space_type: string;
  @ApiProperty({ example: 8 }) total_capacity: number;
  @ApiPropertyOptional({ example: { mon: '08:00-22:00' } }) operating_hours: object | null;
  @ApiProperty({ example: ['cctv', 'covered'] }) amenities: string[];
  @ApiPropertyOptional({ example: 210 }) max_height_cm: number | null;
  @ApiPropertyOptional({ example: 5000, description: 'Lot hourly price in paisa' }) base_rate_unit: number | null;
  @ApiProperty({ type: [VehicleRateDto] }) vehicle_rates: VehicleRateDto[];
  @ApiProperty({ type: [SpacePhotoLinkDto], description: 'Lot photos only; slot images used by the AI are left out' })
  photos: SpacePhotoLinkDto[];
}
