import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateBookingDto, QuoteBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CheckInDto, ExtendBookingDto } from './dto/booking-lifecycle.dto';
import { EDITOR_RATE_NAME } from '../spaces/rate-plan.constants';

// the Prisma client or an interactive transaction, so pricing works in both
type Db = Pick<PrismaService, 'parking_slots' | 'parking_spaces' | 'rate_plans'>;

// ── booking rules (industry-style limits)
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
const HOUR_MS = 60 * 60 * 1000;
const CHECK_IN_EARLY_MS = 15 * 60 * 1000; // check-in opens 15 minutes before the start
const CHECK_IN_RADIUS_M = 200; // GPS check-in must be this close to the lot
const OVERSTAY_GRACE_MS = 10 * 60 * 1000; // leaving up to 10 minutes late is free

// relations every booking response needs
const BOOKING_INCLUDE = {
  slot: { select: { slot_label: true } },
  space: {
    select: { name: true, address: true, latitude: true, longitude: true, base_rate_unit: true },
  },
} as const;

// great-circle distance in metres
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

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

  // ── pricing
  // Hourly rate of a slot, most specific first: the slot's own price, then the
  // lot's rate for the slot's vehicle type, then the lot's base price.
  // Prices are in paisa; null when the lot has no price at all.
  private async price(db: Db, spaceId: string, slotId: string, hours: number) {
    // one after another: inside a transaction they share one connection
    const slot = await db.parking_slots.findUnique({ where: { id: slotId }, select: { vehicle_types: true } });
    const space = await db.parking_spaces.findUnique({ where: { id: spaceId }, select: { base_rate_unit: true } });
    const plans = await db.rate_plans.findMany({
      where: {
        space_id: spaceId, name: EDITOR_RATE_NAME, rent_type: 'hourly',
        is_active: true, deleted_at: null,
        OR: [{ slot_id: slotId }, { slot_id: null, vehicle_type: { not: null } }],
      },
      select: { slot_id: true, vehicle_type: true, amount_unit: true },
    });

    const slotPlan = plans.find((p) => p.slot_id === slotId);
    const vehicle = slot?.vehicle_types[0];
    const vehiclePlan = plans.find((p) => p.slot_id === null && p.vehicle_type === vehicle);

    const [hourly, source] = slotPlan
      ? [slotPlan.amount_unit, 'slot' as const]
      : vehiclePlan
        ? [vehiclePlan.amount_unit, 'vehicle' as const]
        : [space?.base_rate_unit ?? null, 'lot' as const];

    const base = hourly === null ? null : hourly * hours;
    return {
      hourly_rate_unit: hourly,
      rate_source: hourly === null ? null : source,
      base_amount_unit: base,
      discount_unit: base === null ? null : 0,
      amount_unit: base,
    };
  }

  // Start/end of a requested booking, after the time rules
  private bookingWindow(scheduled: string, durationHours: number) {
    const now = new Date();
    const scheduledAt = new Date(scheduled);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid start time');
    }
    if (durationHours > MAX_DURATION_HOURS) {
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
    const endAt = new Date(scheduledAt.getTime() + durationHours * 60 * 60 * 1000);
    return { now, scheduledAt, endAt };
  }

  // Slots that can be booked for [from, to); camera "occupied" only matters for imminent bookings
  private freeSlotWhere(spaceId: string, now: Date, from: Date, to: Date) {
    const imminent = from.getTime() - now.getTime() <= OCCUPIED_CHECK_WINDOW_MS;
    return {
      space_id: spaceId,
      deleted_at: null,
      status: 'active' as const,
      is_bookable: true,
      ...(imminent ? { occupied: false } : {}),
      bookings: { none: this.overlapping(from, to) },
    };
  }

  // ── quote
  // Same slot choice and price as POST /bookings would make right now; nothing is held.

  async quote(dto: QuoteBookingDto) {
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: dto.space_id, deleted_at: null, status: 'active' },
      select: { id: true },
    });
    if (!space) throw new NotFoundException('Parking space not found or inactive');

    const { now, scheduledAt, endAt } = this.bookingWindow(dto.scheduled_at, dto.duration_hours);
    const where = this.freeSlotWhere(dto.space_id, now, scheduledAt, endAt);

    let slot: { id: string; slot_label: string } | null;
    if (dto.slot_id) {
      const exists = await this.prisma.parking_slots.findFirst({
        where: { id: dto.slot_id, space_id: dto.space_id, deleted_at: null },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Slot not found in this space');
      slot = await this.prisma.parking_slots.findFirst({
        where: { ...where, id: dto.slot_id },
        select: { id: true, slot_label: true },
      });
      if (!slot) throw new ConflictException('Selected slot is not available for this time');
    } else {
      slot = await this.prisma.parking_slots.findFirst({
        where,
        orderBy: { slot_label: 'asc' },
        select: { id: true, slot_label: true },
      });
      if (!slot) throw new ConflictException('No available slots in this space for the selected time');
    }

    const price = await this.price(this.prisma, dto.space_id, slot.id, dto.duration_hours);
    return {
      space_id: dto.space_id,
      slot_id: slot.id,
      slot_label: slot.slot_label,
      scheduled_at: scheduledAt,
      end_at: endAt,
      duration_hours: dto.duration_hours,
      ...price,
      total_price: price.amount_unit === null ? null : price.amount_unit / 100,
    };
  }

  // ── create booking

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
    const { now, scheduledAt, endAt: holdExpiresAt } = this.bookingWindow(
      dto.scheduled_at,
      dto.duration_hours,
    );
    const plate = dto.vehicle_plate?.trim().toUpperCase() || undefined;

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
      const slotWhere = this.freeSlotWhere(dto.space_id, now, scheduledAt, holdExpiresAt);

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

      // 6) price of the chosen slot, worked out here so the client cannot set it
      const price = await this.price(tx, dto.space_id, slotId, dto.duration_hours);

      return tx.bookings.create({
        data: {
          driver_id: driver.id,
          slot_id: slotId,
          space_id: dto.space_id,
          scheduled_at: scheduledAt,
          end_at: holdExpiresAt,
          hold_expires_at: holdExpiresAt,
          vehicle_plate: plate,
          base_amount_unit: price.base_amount_unit,
          discount_unit: price.discount_unit,
          amount_unit: price.amount_unit,
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

  async findAll(user: JwtPayload, query: ListBookingsQueryDto) {
    const { page, limit } = query;
    const driver = await this.prisma.driver_profiles.findFirst({
      where: { user_id: user.sub, deleted_at: null },
    });
    if (!driver) return { data: [], page, limit, total: 0 };

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from >= to) throw new BadRequestException('"from" must be before "to"');

    const where = {
      driver_id: driver.id,
      deleted_at: null,
      ...(query.status?.length && { status: { in: query.status } }),
      ...((from || to) && { scheduled_at: { ...(from && { gte: from }), ...(to && { lt: to }) } }),
    };

    const [total, bookings] = await Promise.all([
      this.prisma.bookings.count({ where }),
      this.prisma.bookings.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
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
      orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
      }),
    ]);

    return { data: bookings.map((b) => this.formatBooking(b)), page, limit, total };
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

  // ── check-in / check-out / extend ─────────────────────────────────────────

  // The caller's own booking (admin may act on any)
  private async ownBooking(id: string, user: JwtPayload) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id, deleted_at: null },
      include: {
        driver: { select: { user_id: true } },
        slot: { select: { qr_code: true } },
        space: { select: { latitude: true, longitude: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driver.user_id !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }
    return booking;
  }

  // Arrival: proven by the slot's QR code, or (when the slot has none) by phone GPS near the lot.
  async checkIn(id: string, dto: CheckInDto, user: JwtPayload) {
    const booking = await this.ownBooking(id, user);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Cannot check in to a booking with status: ${booking.status}`);
    }
    if (booking.arrived_at) throw new ConflictException('Already checked in');

    const now = new Date();
    const end = booking.end_at ?? booking.hold_expires_at;
    if (now.getTime() < booking.scheduled_at.getTime() - CHECK_IN_EARLY_MS) {
      throw new BadRequestException(
        `Check-in opens ${CHECK_IN_EARLY_MS / 60_000} minutes before the booking starts`,
      );
    }
    if (end && now > end) throw new BadRequestException('This booking has already ended');

    if (booking.slot.qr_code) {
      if (dto.qr_code !== booking.slot.qr_code) {
        throw new BadRequestException('Scan the QR code on your booked slot to check in');
      }
    } else {
      if (dto.latitude === undefined || dto.longitude === undefined) {
        throw new BadRequestException('Send your location (latitude, longitude) to check in');
      }
      const metres = distanceMetres(dto.latitude, dto.longitude, booking.space.latitude, booking.space.longitude);
      if (metres > CHECK_IN_RADIUS_M) {
        throw new BadRequestException(
          `You are ${Math.round(metres)} m from the parking; check in within ${CHECK_IN_RADIUS_M} m`,
        );
      }
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: { arrived_at: now },
      include: BOOKING_INCLUDE,
    });
    return this.formatBooking(updated);
  }

  // Departure: completes the booking. Time past the booked end (after a short grace)
  // is charged per started hour at the booking's hourly rate.
  async checkOut(id: string, user: JwtPayload) {
    const booking = await this.ownBooking(id, user);
    if (!booking.arrived_at) throw new BadRequestException('Check in before checking out');
    if (booking.departed_at) throw new ConflictException('Already checked out');

    const now = new Date();
    const end = booking.end_at ?? booking.hold_expires_at ?? now;
    const lateMs = now.getTime() - end.getTime() - OVERSTAY_GRACE_MS;
    const overstayHours = lateMs > 0 ? Math.ceil(lateMs / HOUR_MS) : 0;

    const bookedHours = Math.round((end.getTime() - booking.scheduled_at.getTime()) / HOUR_MS);
    const hourly = booking.base_amount_unit && bookedHours ? Math.round(booking.base_amount_unit / bookedHours) : 0;
    const overstayUnit = overstayHours * hourly;

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: {
        departed_at: now,
        status: 'completed',
        ...(overstayUnit > 0 && { amount_unit: (booking.amount_unit ?? 0) + overstayUnit }),
      },
      include: BOOKING_INCLUDE,
    });
    return { ...this.formatBooking(updated), overstay_hours: overstayHours, overstay_unit: overstayUnit };
  }

  // More time on the same slot, if nobody else has booked it right after.
  async extend(id: string, dto: ExtendBookingDto, user: JwtPayload) {
    const booking = await this.ownBooking(id, user);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Cannot extend a booking with status: ${booking.status}`);
    }
    if (booking.departed_at) throw new BadRequestException('Already checked out');

    const end = booking.end_at ?? booking.hold_expires_at;
    if (!end) throw new BadRequestException('This booking has no end time');
    if (end < new Date() && !booking.arrived_at) {
      throw new BadRequestException('This booking has already ended');
    }
    const newEnd = new Date(end.getTime() + dto.extra_hours * HOUR_MS);
    if (newEnd.getTime() - booking.scheduled_at.getTime() > MAX_DURATION_HOURS * HOUR_MS) {
      throw new BadRequestException(`A booking can last at most ${MAX_DURATION_HOURS} hours`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // same lock as booking creation, so nobody books the extra time at the same moment
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'space:' + booking.space_id}))`;

      const clash = await tx.bookings.findFirst({
        where: { slot_id: booking.slot_id, id: { not: id }, ...this.overlapping(end, newEnd) },
        select: { id: true },
      });
      if (clash) throw new ConflictException('The slot is booked by someone else in that time');

      const extra = await this.price(tx, booking.space_id, booking.slot_id, dto.extra_hours);
      return tx.bookings.update({
        where: { id },
        data: {
          end_at: newEnd,
          hold_expires_at: newEnd,
          extended_to: newEnd,
          ...(extra.amount_unit !== null && {
            base_amount_unit: (booking.base_amount_unit ?? 0) + extra.amount_unit,
            amount_unit: (booking.amount_unit ?? 0) + extra.amount_unit,
          }),
        },
        include: BOOKING_INCLUDE,
      });
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
      base_amount_unit: booking.base_amount_unit ?? null,
      discount_unit: booking.discount_unit ?? null,
      amount_unit: booking.amount_unit,
      // price_per_hour in BDT (amount_unit is in paisa): the rate actually charged,
      // falling back to the lot price for bookings made before slot/vehicle pricing
      price_per_hour: booking.base_amount_unit && hours
        ? booking.base_amount_unit / hours / 100
        : booking.space?.base_rate_unit
          ? booking.space.base_rate_unit / 100
          : 0,
      total_price: booking.amount_unit ? booking.amount_unit / 100 : 0,
      cancellation_reason: booking.cancellation_reason ?? null,
      vehicle_plate: booking.vehicle_plate ?? null,
      arrived_at: booking.arrived_at ?? null,
      departed_at: booking.departed_at ?? null,
      extended_to: booking.extended_to ?? null,
      created_at: booking.created_at,
    };
  }
}
