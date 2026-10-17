import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SpacesService } from './spaces.service';
import {
  BulkCreateSlotsDto,
  BulkUpdateSlotsDto,
  CreateSlotDto,
  ListSlotsQueryDto,
  SlotBboxDto,
  SlotDefaultsDto,
  UpdateSlotDto,
} from './dto/slot.dto';

const LIVE_BOOKING = ['pending', 'confirmed'] as const;

// fields a driver may see; owners and admins get the full row
const PUBLIC_SLOT_FIELDS = {
  id: true,
  slot_label: true,
  display_name: true,
  zone: true,
  floor: true,
  sort_order: true,
  slot_type: true,
  vehicle_types: true,
  length_cm: true,
  width_cm: true,
  max_height_cm: true,
  features: true,
  ev_charger_kw: true,
  allow_hourly: true,
  allow_daily: true,
  allow_monthly: true,
  access_note: true,
  cover_photo_key: true,
  occupied: true,
  last_updated: true,
} as const;

@Injectable()
export class SlotsService {
  constructor(
    private prisma: PrismaService,
    private spaces: SpacesService,
  ) { }

  // ── create ────────────────────────────────────────────────────────────────

  async create(spaceId: string, dto: CreateSlotDto, user: JwtPayload) {
    const space = await this.getManagedSpace(spaceId, user);
    const data = this.toData(dto);
    await this.assertRefs(spaceId, dto);
    await this.assertCapacity(space, 1);

    const exists = await this.prisma.parking_slots.findFirst({
      where: { space_id: spaceId, slot_label: dto.slot_label },
      select: { id: true },
    });
    if (exists) throw new ConflictException(`Slot ${dto.slot_label} already exists`);

    return this.prisma.parking_slots.create({
      data: {
        ...data,
        space_id: spaceId,
        slot_label: dto.slot_label,
        qr_code: dto.qr_code ?? this.newQrCode(),
      },
    });
  }

  // POST with prefix + count: A-1 ... A-50; labels that already exist are skipped
  async bulkCreate(spaceId: string, dto: BulkCreateSlotsDto, user: JwtPayload) {
    const space = await this.getManagedSpace(spaceId, user);
    const defaults = dto.defaults ?? {};
    const base = this.toData(defaults);
    await this.assertRefs(spaceId, defaults);

    const start = dto.start ?? 1;
    const labels = Array.from({ length: dto.count }, (_, i) =>
      `${dto.prefix}${String(start + i).padStart(dto.pad ?? 0, '0')}`,
    );
    if (labels.some((l) => l.length > 20)) {
      throw new BadRequestException('Slot labels must be at most 20 characters');
    }

    const existing = await this.prisma.parking_slots.findMany({
      where: { space_id: spaceId, slot_label: { in: labels } },
      select: { slot_label: true },
    });
    const taken = new Set(existing.map((s) => s.slot_label));
    const fresh = labels.filter((l) => !taken.has(l));
    await this.assertCapacity(space, fresh.length);

    await this.prisma.parking_slots.createMany({
      data: fresh.map((label, i) => ({
        ...base,
        space_id: spaceId,
        slot_label: label,
        sort_order: start + i,
        qr_code: this.newQrCode(),
      })),
    });

    return { created: fresh, skipped: [...taken] };
  }

  // ── read ──────────────────────────────────────────────────────────────────

  async findAll(spaceId: string, query: ListSlotsQueryDto, user: JwtPayload) {
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: spaceId, deleted_at: null },
      select: { owner_id: true },
    });
    if (!space) throw new NotFoundException('Space not found');
    const manager = user.role === 'admin' || space.owner_id === user.sub;

    if ((query.from && !query.to) || (!query.from && query.to)) {
      throw new BadRequestException('Give both "from" and "to"');
    }

    const where: Record<string, unknown> = {
      space_id: spaceId,
      deleted_at: null,
      ...(query.zone && { zone: query.zone }),
      ...(query.floor && { floor: query.floor }),
      ...(query.slot_type && { slot_type: query.slot_type }),
      ...(query.vehicle_type && { vehicle_types: { has: query.vehicle_type } }),
    };
    // drivers only see slots they could book
    if (manager) {
      if (query.status) where.status = query.status;
    } else {
      where.status = 'active';
      where.is_bookable = true;
    }
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      if (from >= to) throw new BadRequestException('"from" must be before "to"');
      where.bookings = { none: this.overlapping(from, to) };
    }

    return this.prisma.parking_slots.findMany({
      where,
      orderBy: [{ zone: 'asc' }, { sort_order: 'asc' }, { slot_label: 'asc' }],
      ...(manager ? {} : { select: PUBLIC_SLOT_FIELDS }),
    });
  }

  async findOne(spaceId: string, slotId: string, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    return this.getSlot(spaceId, slotId);
  }

  // ── update ────────────────────────────────────────────────────────────────

  async update(spaceId: string, slotId: string, dto: UpdateSlotDto, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    const slot = await this.getSlot(spaceId, slotId);
    await this.assertRefs(spaceId, dto);

    if (dto.slot_label && dto.slot_label !== slot.slot_label) {
      const clash = await this.prisma.parking_slots.findFirst({
        where: { space_id: spaceId, slot_label: dto.slot_label },
        select: { id: true },
      });
      if (clash) throw new ConflictException(`Slot ${dto.slot_label} already exists`);
    }

    return this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        ...this.toData(dto),
        ...(dto.slot_label && { slot_label: dto.slot_label }),
        ...(dto.qr_code && { qr_code: dto.qr_code }),
      },
    });
  }

  async bulkUpdate(spaceId: string, dto: BulkUpdateSlotsDto, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    await this.assertRefs(spaceId, dto.changes);

    const result = await this.prisma.parking_slots.updateMany({
      where: { id: { in: dto.slot_ids }, space_id: spaceId, deleted_at: null },
      data: this.toData(dto.changes),
    });
    return { updated: result.count };
  }

  // ── delete (soft) ─────────────────────────────────────────────────────────

  async remove(spaceId: string, slotId: string, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    const slot = await this.getSlot(spaceId, slotId);

    const now = new Date();
    const upcoming = await this.prisma.bookings.count({
      where: { slot_id: slotId, ...this.overlapping(now, new Date(8.64e15)) },
    });
    if (upcoming > 0) {
      throw new ConflictException(
        `Slot ${slot.slot_label} has ${upcoming} current or upcoming booking(s); set it to inactive instead`,
      );
    }

    // free the label and QR code so they can be reused
    await this.prisma.parking_slots.update({
      where: { id: slotId },
      data: {
        deleted_at: now,
        slot_label: `${slot.slot_label.slice(0, 7)}~${slotId.slice(0, 12)}`,
        qr_code: null,
      },
    });
    return { message: 'Slot deleted' };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async getManagedSpace(spaceId: string, user: JwtPayload) {
    await this.spaces.assertOwnership(spaceId, user);
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: spaceId, deleted_at: null },
      select: { id: true, total_capacity: true },
    });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  private async getSlot(spaceId: string, slotId: string) {
    const slot = await this.prisma.parking_slots.findFirst({
      where: { id: slotId, space_id: spaceId, deleted_at: null },
      include: { camera: { select: { id: true, label: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  private async assertCapacity(space: { id: string; total_capacity: number }, adding: number) {
    const current = await this.prisma.parking_slots.count({
      where: { space_id: space.id, deleted_at: null },
    });
    if (current + adding > space.total_capacity) {
      throw new BadRequestException(
        `Space capacity is ${space.total_capacity} and it has ${current} slots; raise total_capacity first`,
      );
    }
  }

  // camera must belong to this space; assigned driver must exist
  private async assertRefs(spaceId: string, dto: SlotDefaultsDto) {
    if (dto.camera_id) {
      const camera = await this.prisma.cameras.findFirst({
        where: { id: dto.camera_id, space_id: spaceId, deleted_at: null },
        select: { id: true },
      });
      if (!camera) throw new BadRequestException('Camera not found in this space');
    }
    if (dto.assigned_driver_id) {
      const driver = await this.prisma.driver_profiles.findFirst({
        where: { id: dto.assigned_driver_id, deleted_at: null },
        select: { id: true },
      });
      if (!driver) throw new BadRequestException('Driver not found');
    }
  }

  // bookings that still hold the slot at any point between from and to
  private overlapping(from: Date, to: Date) {
    return {
      deleted_at: null,
      status: { in: [...LIVE_BOOKING] },
      scheduled_at: { lt: to },
      OR: [
        { end_at: { gt: from } },
        { end_at: null, hold_expires_at: { gt: from } },
      ],
    };
  }

  // DTO -> columns, leaving out fields that were not sent
  private toData(dto: SlotDefaultsDto & { bbox?: SlotBboxDto; mask_polygon?: number[][]; display_name?: string; sort_order?: number }) {
    const b = dto.bbox;
    if (b && (b.x1 >= b.x2 || b.y1 >= b.y2)) {
      throw new BadRequestException('bbox needs x1 < x2 and y1 < y2');
    }
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined || key === 'slot_label' || key === 'qr_code') continue;
      data[key] = key === 'bbox' ? { ...value } : value;
    }
    return data;
  }

  private newQrCode() {
    return randomBytes(8).toString('hex');
  }
}
