import { Body, Controller, Param, ParseEnumPipe, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { VehicleKind } from './dto/slot.dto';
import { RatesService } from './rates.service';

class SetVehicleRateDto {
  @ApiProperty({ example: 5000, description: 'Hourly price in paisa (5000 = 50 BDT)' })
  @IsInt() @Min(1) @Max(10_000_000)
  hourly_rate_unit: number;
}

@ApiTags('rates')
@ApiBearerAuth()
@Controller('spaces/:spaceId/rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RatesController {
  constructor(private ratesService: RatesService) { }

  // PUT /spaces/:spaceId/rates/:vehicleType — set the lot's hourly price for one vehicle type
  @Put(':vehicleType')
  setVehicleRate(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('vehicleType', new ParseEnumPipe(VehicleKind)) vehicleType: VehicleKind,
    @Body() dto: SetVehicleRateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ratesService.setVehicleRate(spaceId, vehicleType, dto.hourly_rate_unit, user);
  }
}
