import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── create booking ────────────────────────────────────────────────────────

  async create(dto: CreateBookingDto, user: JwtPayload) {
    // Must have a driver profile
    const driver = await this.prisma.driver_profiles.findFirst({
      where: { user_id: user.sub, deleted_at: null },
    });
    if (!driver) {
      throw new BadRequestException(
        'Driver profile required to make a booking. Please complete your driver profile first.',
      );
    }

    // Verify space exists and is active
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: dto.space_id, deleted_at: null, status: 'active' },
    });
    if (!space) throw new NotFoundException('Parking space not found or inactive');

    // Resolve slot — use provided slot_id or auto-select first available
    let slotId = dto.slot_id;
    if (slotId) {
      const slot = await this.prisma.parking_slots.findFirst({
        where: { id: slotId, space_id: dto.space_id, deleted_at: null },
      });
      if (!slot) throw new NotFoundException('Slot not found in this space');
      if (slot.occupied) throw new BadRequestException('Selected slot is currently occupied');
    } else {
      // Auto-pick first non-occupied slot
      const slot = await this.prisma.parking_slots.findFirst({
        where: { space_id: dto.space_id, occupied: false, deleted_at: null },
        orderBy: { slot_label: 'asc' },
      });
      if (!slot) throw new BadRequestException('No available slots in this space');
      slotId = slot.id;
    }

    const scheduledAt = new Date(dto.scheduled_at);
    const holdExpiresAt = new Date(scheduledAt.getTime() + dto.duration_hours * 60 * 60 * 1000);

    // Calculate amount: base_rate_unit is in paisa (1/100 BDT), duration in hours
    const amountUnit = space.base_rate_unit
      ? space.base_rate_unit * dto.duration_hours
      : null;

    const booking = await this.prisma.bookings.create({
      data: {
        driver_id: driver.id,
        slot_id: slotId,
        space_id: dto.space_id,
        scheduled_at: scheduledAt,
        hold_expires_at: holdExpiresAt,
        amount_unit: amountUnit,
        status: 'confirmed',
      },
      include: {
        slot: { select: { slot_label: true } },
        space: { select: { name: true, address: true, latitude: true, longitude: true, base_rate_unit: true } },
      },
    });

    return this.formatBooking(booking, dto.duration_hours);
  }

  // ── list driver's bookings ─────────────────────────────────────────────────

  async findAll(user: JwtPayload) {
    const driver = await this.prisma.driver_profiles.findFirst({
      where: { user_id: user.sub, deleted_at: null },
    });
    if (!driver) return [];

    const bookings = await this.prisma.bookings.findMany({
      where: { driver_id: driver.id, deleted_at: null },
      include: {
        slot: { select: { slot_label: true } },
        space: { select: { name: true, address: true, latitude: true, longitude: true, base_rate_unit: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return bookings.map((b) => this.formatBooking(b));
  }

  // ── get one ───────────────────────────────────────────────────────────────

  async findOne(id: string, user: JwtPayload) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id, deleted_at: null },
      include: {
        slot: { select: { slot_label: true } },
        space: { select: { name: true, address: true, latitude: true, longitude: true, base_rate_unit: true } },
        driver: { select: { user_id: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driver.user_id !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.formatBooking(booking);
  }

  // ── cancel booking ────────────────────────────────────────────────────────

  async cancel(id: string, user: JwtPayload) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id, deleted_at: null },
      include: { driver: { select: { user_id: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driver.user_id !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a booking with status: ${booking.status}`);
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: { status: 'cancelled', cancellation_reason: 'Cancelled by driver' },
      include: {
        slot: { select: { slot_label: true } },
        space: { select: { name: true, address: true, latitude: true, longitude: true, base_rate_unit: true } },
      },
    });

    return this.formatBooking(updated);
  }

  // ── format response ───────────────────────────────────────────────────────

  private formatBooking(booking: any, durationHours?: number) {
    const scheduled = new Date(booking.scheduled_at);
    const expires = booking.hold_expires_at ? new Date(booking.hold_expires_at) : null;
    const durationMs = expires ? expires.getTime() - scheduled.getTime() : 0;
    const hours = durationHours ?? Math.round(durationMs / (1000 * 60 * 60));

    return {
      id: booking.id,
      space_id: booking.space_id,
      space_name: booking.space?.name ?? '',
      space_address: booking.space?.address ?? '',
      latitude: booking.space?.latitude ?? 0,
      longitude: booking.space?.longitude ?? 0,
      slot_id: booking.slot_id,
      slot_label: booking.slot?.slot_label ?? '',
      status: booking.status,
      scheduled_at: booking.scheduled_at,
      hold_expires_at: booking.hold_expires_at,
      duration_hours: hours,
      amount_unit: booking.amount_unit,
      // price_per_hour in BDT (amount_unit is in paisa)
      price_per_hour: booking.space?.base_rate_unit
        ? booking.space.base_rate_unit / 100
        : 0,
      total_price: booking.amount_unit ? booking.amount_unit / 100 : 0,
      cancellation_reason: booking.cancellation_reason ?? null,
      created_at: booking.created_at,
    };
  }
}
