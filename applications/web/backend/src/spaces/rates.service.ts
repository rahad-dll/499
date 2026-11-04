import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SpacesService } from './spaces.service';
import { EDITOR_RATE_NAME } from './cameras.service';
import { VehicleKind } from './dto/slot.dto';

@Injectable()
export class RatesService {
  constructor(
    private prisma: PrismaService,
    private spaces: SpacesService,
  ) { }

  // ── PUT /spaces/:spaceId/rates/:vehicleType
  // Sets the lot's hourly price for one vehicle type. Slots with their own
  // price keep it; other slots of this vehicle type use this rate.

  async setVehicleRate(spaceId: string, vehicleType: VehicleKind, amount: number, user: JwtPayload) {
    await this.spaces.assertOwnership(spaceId, user);
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: spaceId, deleted_at: null },
      select: { id: true },
    });
    if (!space) throw new NotFoundException('Space not found');

    const where = {
      space_id: spaceId, name: EDITOR_RATE_NAME, rent_type: 'hourly' as const,
      slot_id: null, vehicle_type: vehicleType, deleted_at: null, is_active: true,
    };
    const existing = await this.prisma.rate_plans.findFirst({ where, select: { id: true } });

    const plan = existing
      ? await this.prisma.rate_plans.update({ where: { id: existing.id }, data: { amount_unit: amount } })
      : await this.prisma.rate_plans.create({
        data: {
          space_id: spaceId, name: EDITOR_RATE_NAME, rent_type: 'hourly',
          vehicle_type: vehicleType, amount_unit: amount,
        },
      });

    return {
      space_id: spaceId,
      vehicle_type: plan.vehicle_type,
      hourly_rate_unit: plan.amount_unit,
      updated_at: plan.updated_at,
    };
  }
}
