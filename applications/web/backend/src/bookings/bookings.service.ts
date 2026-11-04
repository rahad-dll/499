import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBookingDto } from './dto/create-booking.dto';

// ── booking rules (industry-style limits) ────────────────────────────────────
// One driver cannot hoard slots: a small number of live bookings, no two
// bookings for the same time window, no booking in the past, and no endless
// book-then-cancel loops that keep slots blocked for everybody else.
const LIVE_STATUSES = ['pending', 'confirmed'] as const;
const MAX_LIVE_BOOKINGS_PER_DRIVER = 2; // upcoming + ongoing at the same time
const MAX_ADVANCE_DAYS = 30; // cannot book further ahead than this
const MAX_DURATION_HOURS = 24; // single booking length cap
const PAST_GRACE_MS = 5 * 60 * 1000; // allow "now" to be a few minutes old
const MAX_CANCELLATIONS_PER_24H = 5; // abuse guard, applies to NEW bookings
const OCCUPIED_CHECK_WINDOW_MS = 15 * 60 * 1000; // camera "occupied" only matters for imminent bookings

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Live bookings that hold a slot / a driver / a plate at any point in
  // [from, to). Mirrors SlotsService.overlapping(): a booking that has no
  // end_at falls back to hold_expires_at.
  private overlapping(from: Date, to: Date) {
    return {
      deleted_at: null,
      status: { in: [...LIVE_STATUSES] },
      scheduled_at: { lt: to },
      OR: [
        { end_at: { gt: from } },
        { end_at: null, hold_expires_at: { gt: from } },
      ],
    };
  }

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
    if (!space)
      throw new NotFoundException('Parking space not found or inactive');

    // ── time rules ──
    const now = new Date();
    const scheduledAt = new Date(dto.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid start time');
    }
    if (dto.duration_hours > MAX_DURATION_HOURS) {
      throw new BadRequestException(
        `You can book at most ${MAX_DURATION_HOURS} hours at a time`,
      );
    }
    if (scheduledAt.getTime() < now.getTime() - PAST_GRACE_MS) {
      throw new BadRequestException(
        'Start time is in the past. Please pick a later time.',
      );
    }
    if (
      scheduledAt.getTime() >
      now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        `You can only book up to ${MAX_ADVANCE_DAYS} days ahead`,
      );
    }
    const holdExpiresAt = new Date(
      scheduledAt.getTime() + dto.duration_hours * 60 * 60 * 1000,
    );
    const plate = dto.vehicle_plate?.trim().toUpperCase() || undefined;

    // Calculate amount: base_rate_unit is in paisa (1/100 BDT), duration in hours
    const amountUnit = space.base_rate_unit
      ? space.base_rate_unit * dto.duration_hours
      : null;

    // Everything below runs inside one transaction guarded by advisory locks,
    // so two requests at the same moment cannot both pass the checks
    // (same driver double-booking, or two drivers grabbing the same slot).
    // Lock order is always driver -> space, so no deadlocks.
    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'driver:' + driver.id}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'space:' + dto.space_id}))`;

      // 1) abuse guard: too many recent cancellations
      const recentCancels = await tx.bookings.count({
        where: {
          driver_id: driver.id,
          status: 'cancelled',
          updated_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recentCancels >= MAX_CANCELLATIONS_PER_24H) {
        throw new BadRequestException(
          'Too many cancellations today. Please try again later.',
        );
      }

      // 2) max live bookings per driver (not yet ended)
      const liveCount = await tx.bookings.count({
        where: {
          driver_id: driver.id,
          deleted_at: null,
          status: { in: [...LIVE_STATUSES] },
          OR: [
            { end_at: { gt: now } },
            { end_at: null, hold_expires_at: { gt: now } },
          ],
        },
      });
      if (liveCount >= MAX_LIVE_BOOKINGS_PER_DRIVER) {
        throw new ConflictException(
          `You already have ${liveCount} active/upcoming bookings (max ${MAX_LIVE_BOOKINGS_PER_DRIVER}). Cancel one or wait until it ends.`,
        );
      }

      // 3) same driver cannot hold two bookings in the same time window
      const driverClash = await tx.bookings.findFirst({
        where: {
          driver_id: driver.id,
          ...this.overlapping(scheduledAt, holdExpiresAt),
        },
        select: { id: true },
      });
      if (driverClash) {
        throw new ConflictException(
          'You already have a booking that overlaps this time. Pick a different time or cancel the other booking.',
        );
      }

      // 4) same vehicle cannot be booked twice in the same window
      if (plate) {
        const plateClash = await tx.bookings.findFirst({
          where: {
            vehicle_plate: plate,
            ...this.overlapping(scheduledAt, holdExpiresAt),
          },
          select: { id: true },
        });
        if (plateClash) {
          throw new ConflictException(
            `Vehicle ${plate} already has a booking that overlaps this time.`,
          );
        }
      }

      // 5) resolve slot — must be bookable, free of other bookings in this
      //    window, and (only for imminent bookings) not physically occupied
      const imminent =
        scheduledAt.getTime() - now.getTime() <= OCCUPIED_CHECK_WINDOW_MS;
      const slotWhere = {
        space_id: dto.space_id,
        deleted_at: null,
        status: 'active' as const,
        is_bookable: true,
        ...(imminent ? { occupied: false } : {}),
        bookings: { none: this.overlapping(scheduledAt, holdExpiresAt) },
      };

      let slotId = dto.slot_id;
      if (slotId) {
        const slot = await tx.parking_slots.findFirst({
          where: { id: slotId, space_id: dto.space_id, deleted_at: null },
        });
        if (!slot) throw new NotFoundException('Slot not found in this space');
        const free = await tx.parking_slots.findFirst({
          where: { ...slotWhere, id: slotId },
          select: { id: true },
        });
        if (!free) {
          throw new ConflictException(
            'Selected slot is not available for this time',
          );
        }
      } else {
        const slot = await tx.parking_slots.findFirst({
          where: slotWhere,
          orderBy: { slot_label: 'asc' },
          select: { id: true },
        });
        if (!slot) {
          throw new ConflictException(
            'No available slots in this space for the selected time',
          );
        }
        slotId = slot.id;
      }

      return tx.bookings.create({
        data: {
          driver_id: driver.id,
          slot_id: slotId,
          space_id: dto.space_id,
          scheduled_at: scheduledAt,
          end_at: holdExpiresAt,
          hold_expires_at: holdExpiresAt,
          vehicle_plate: plate,
          amount_unit: amountUnit,
          status: 'confirmed',
        },
        include: {
          slot: { select: { slot_label: true } },
          space: {
            select: {
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              base_rate_unit: true,
            },
          },
        },
      });
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
        space: {
          select: {
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            base_rate_unit: true,
          },
        },
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
        space: {
          select: {
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            base_rate_unit: true,
          },
        },
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
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }
    if (booking.status === 'no_show') {
      throw new BadRequestException(
        'Cannot cancel a booking with status: no_show',
      );
    }
    // once the car has checked in it is parked — it can't be "cancelled" any more
    if (booking.arrived_at !== null && booking.departed_at === null) {
      throw new BadRequestException(
        'You have already arrived at this parking, so it cannot be cancelled',
      );
    }
    const endsAt =
      booking.extended_to ?? booking.end_at ?? booking.hold_expires_at;
    if (endsAt !== null && endsAt < new Date()) {
      throw new BadRequestException('This booking has already ended');
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: { status: 'cancelled', cancellation_reason: 'Cancelled by driver' },
      include: {
        slot: { select: { slot_label: true } },
        space: {
          select: {
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            base_rate_unit: true,
          },
        },
      },
    });

    return this.formatBooking(updated);
  }

  // ── hide from history (soft delete) ───────────────────────────────────────

  async hide(id: string, user: JwtPayload) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id, deleted_at: null },
      include: { driver: { select: { user_id: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driver.user_id !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    // an active booking still holds its slot, so it cannot be hidden:
    // not cancelled/completed/no-show, and either not yet ended (incl. extensions) or the car is still parked
    const end =
      booking.extended_to ?? booking.end_at ?? booking.hold_expires_at;
    const stillParked =
      booking.arrived_at !== null && booking.departed_at === null;
    const finished =
      ['cancelled', 'completed', 'no_show'].includes(booking.status) ||
      (end !== null && end < new Date() && !stillParked);
    if (!finished) {
      throw new BadRequestException(
        'Cancel the booking first; only past or cancelled bookings can be removed',
      );
    }

    await this.prisma.bookings.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Booking removed from history' };
  }

  // ── format response ───────────────────────────────────────────────────────

  private formatBooking(booking: any, durationHours?: number) {
    const scheduled = new Date(booking.scheduled_at);
    const expires = booking.hold_expires_at
      ? new Date(booking.hold_expires_at)
      : null;
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
      vehicle_plate: booking.vehicle_plate ?? null,
      created_at: booking.created_at,
    };
  }
}
