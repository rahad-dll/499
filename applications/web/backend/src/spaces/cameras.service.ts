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
import { CameraSlotDto, CameraSource, CreateCameraDto, PixelBoxDto, UpdateCameraDto } from './dto/camera.dto';
import { VehicleKind } from './dto/slot.dto';

import { EDITOR_RATE_NAME } from './rate-plan.constants';
// slot type for a new slot, from the vehicle it is drawn for
const SLOT_TYPE_FOR_VEHICLE: Record<VehicleKind, 'standard' | 'compact' | 'large' | 'motorcycle' | 'bicycle'> = {
  [VehicleKind.car]: 'standard',
  [VehicleKind.motorcycle]: 'motorcycle',
  [VehicleKind.cng]: 'compact',
  [VehicleKind.microbus]: 'large',
  [VehicleKind.suv]: 'large',
  [VehicleKind.pickup]: 'large',
  [VehicleKind.bicycle]: 'bicycle',
  [VehicleKind.truck]: 'large',
};

type NormalisedBox = { x1: number; y1: number; x2: number; y2: number };
type Transaction = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class CamerasService {
  constructor(
    private prisma: PrismaService,
    private spaces: SpacesService,
  ) { }

  // ── POST /spaces/:spaceId/cameras
  // Adds one camera with its slots. Other cameras and slots are not touched;
  // the camera and its slots are saved together or not at all.

  async create(spaceId: string, dto: CreateCameraDto, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);

    const slotsIn = dto.slots ?? [];
    this.validateCamera(dto);
    const labels = this.validateSlots(slotsIn, dto);

    const [taken, vehicleRates] = await Promise.all([
      labels.length
        ? this.prisma.parking_slots.findMany({
          where: { space_id: spaceId, deleted_at: null, slot_label: { in: labels } },
          select: { slot_label: true },
        })
        : Promise.resolve([]),
      this.vehicleRates(spaceId),
    ]);
    if (taken.length) {
      throw new ConflictException(`Slot labels already used in this lot: ${taken.map((s) => s.slot_label).join(', ')}`);
    }

    const missingRate = slotsIn
      .filter((s) => s.hourly_rate_unit === undefined && !vehicleRates.has(s.vehicle_type))
      .map((s) => s.slot_label.toUpperCase());
    if (missingRate.length) {
      throw new BadRequestException(
        `No hourly rate for slots ${missingRate.join(', ')}: set the lot's rate for that vehicle type first, or give each slot hourly_rate_unit`,
      );
    }

    const cameraId = await this.prisma.$transaction(async (tx) => {
      return this.createInTransaction(tx, spaceId, dto, slotsIn, vehicleRates);
    }, { timeout: 30_000, maxWait: 10_000 }).catch((error: unknown) => {
      // two requests adding the same label at the same moment: the unique index stops the second one
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A slot label in this camera was just used in this lot; reload and pick another label');
      }
      throw error;
    });

    return this.findOne(spaceId, cameraId);
  }

  private async createInTransaction(
    tx: Transaction,
    spaceId: string,
    dto: CreateCameraDto,
    slotsIn: CameraSlotDto[],
    vehicleRates: Map<VehicleKind, number>,
  ) {
    const order = await tx.cameras.count({ where: { space_id: spaceId, deleted_at: null } });
    const camera = await tx.cameras.create({
      data: {
        space_id: spaceId,
        label: dto.label.trim(),
        source_type: dto.source_type,
        rtsp_url: dto.source_type === CameraSource.rtsp ? dto.rtsp_url!.trim() : null,
        frame_width: dto.frame_width,
        frame_height: dto.frame_height,
        sort_order: order,
        status: 'setup',
      },
      select: { id: true },
    });

    for (const [index, slot] of slotsIn.entries()) {
      const created = await tx.parking_slots.create({
        data: {
          space_id: spaceId,
          camera_id: camera.id,
          slot_label: slot.slot_label.toUpperCase(),
          slot_type: SLOT_TYPE_FOR_VEHICLE[slot.vehicle_type],
          vehicle_types: [slot.vehicle_type],
          bbox: this.toNormalised(slot.bbox, dto.frame_width, dto.frame_height),
          sort_order: index,
          qr_code: randomBytes(8).toString('hex'),
        },
        select: { id: true },
      });
      // a slot only needs its own plan when its price differs from the vehicle rate
      if (slot.hourly_rate_unit !== undefined && slot.hourly_rate_unit !== vehicleRates.get(slot.vehicle_type)) {
        await tx.rate_plans.create({
          data: {
            space_id: spaceId,
            slot_id: created.id,
            vehicle_type: slot.vehicle_type,
            name: EDITOR_RATE_NAME,
            rent_type: 'hourly',
            amount_unit: slot.hourly_rate_unit,
          },
        });
      }
    }

    await this.growCapacity(tx, spaceId);
    return camera.id;
  }

  // ── PATCH /spaces/:spaceId/cameras/:cameraId
  // Changes one camera. Slots are matched by label within this camera: a known
  // label is updated, a new label is added, slots left out are not changed.
  // Other cameras are not touched.

  async update(spaceId: string, cameraId: string, dto: UpdateCameraDto, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    const camera = await this.prisma.cameras.findFirst({
      where: { id: cameraId, space_id: spaceId, deleted_at: null },
      include: { slots: { where: { deleted_at: null }, select: { id: true, slot_label: true, bbox: true, vehicle_types: true } } },
    });
    if (!camera) throw new NotFoundException('Camera not found');

    // the camera as it will be after this request
    const final = {
      label: dto.label?.trim() ?? camera.label ?? '',
      source_type: (dto.source_type ?? camera.source_type) as CameraSource,
      rtsp_url: dto.rtsp_url !== undefined ? dto.rtsp_url : camera.rtsp_url,
      frame_width: dto.frame_width ?? camera.frame_width,
      frame_height: dto.frame_height ?? camera.frame_height,
    };
    this.validateCamera(final);

    const slotsIn = dto.slots ?? [];
    if (slotsIn.length && (!final.frame_width || !final.frame_height)) {
      throw new BadRequestException('Set frame_width and frame_height before adding slots to this camera');
    }
    const frame = { frame_width: final.frame_width ?? 0, frame_height: final.frame_height ?? 0 };
    const labels = this.validateSlots(slotsIn, frame);

    // slots sent here plus this camera's other slots must not overlap
    const existingByLabel = new Map(camera.slots.map((s) => [s.slot_label, s]));
    const errors: string[] = [];
    for (const kept of camera.slots.filter((s) => !labels.includes(s.slot_label))) {
      const box = this.toPixels(kept.bbox as NormalisedBox | null, frame.frame_width, frame.frame_height);
      if (!box) continue;
      for (const slot of slotsIn) {
        if (this.overlaps(slot.bbox, box)) {
          errors.push(`Slots ${kept.slot_label} and ${slot.slot_label.toUpperCase()} overlap.`);
        }
      }
    }
    if (errors.length) throw new BadRequestException(errors);

    // new labels must be free in the whole lot
    const newLabels = labels.filter((l) => !existingByLabel.has(l));
    const [taken, vehicleRates] = await Promise.all([
      newLabels.length
        ? this.prisma.parking_slots.findMany({
          where: { space_id: spaceId, deleted_at: null, slot_label: { in: newLabels } },
          select: { slot_label: true },
        })
        : Promise.resolve([]),
      this.vehicleRates(spaceId),
    ]);
    if (taken.length) {
      throw new ConflictException(`Slot labels already used in this lot: ${taken.map((s) => s.slot_label).join(', ')}`);
    }
    const missingRate = slotsIn
      .filter((s) => !existingByLabel.has(s.slot_label.toUpperCase()))
      .filter((s) => s.hourly_rate_unit === undefined && !vehicleRates.has(s.vehicle_type))
      .map((s) => s.slot_label.toUpperCase());
    if (missingRate.length) {
      throw new BadRequestException(
        `No hourly rate for slots ${missingRate.join(', ')}: set the lot's rate for that vehicle type first, or give each slot hourly_rate_unit`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cameras.update({
        where: { id: cameraId },
        data: {
          label: final.label,
          source_type: final.source_type,
          rtsp_url: final.source_type === CameraSource.rtsp ? final.rtsp_url!.trim() : null,
          frame_width: final.frame_width,
          frame_height: final.frame_height,
        },
      });

      let order = camera.slots.length;
      for (const slot of slotsIn) {
        const label = slot.slot_label.toUpperCase();
        const existing = existingByLabel.get(label);
        const data = {
          slot_type: SLOT_TYPE_FOR_VEHICLE[slot.vehicle_type],
          vehicle_types: [slot.vehicle_type],
          bbox: this.toNormalised(slot.bbox, frame.frame_width, frame.frame_height),
        };
        const slotId = existing
          ? (await tx.parking_slots.update({ where: { id: existing.id }, data, select: { id: true } })).id
          : (await tx.parking_slots.create({
            data: {
              ...data,
              space_id: spaceId,
              camera_id: cameraId,
              slot_label: label,
              sort_order: order++,
              qr_code: randomBytes(8).toString('hex'),
            },
            select: { id: true },
          })).id;

        // own price: replace it when sent; drop it when it equals the vehicle rate
        if (slot.hourly_rate_unit !== undefined) {
          await tx.rate_plans.updateMany({
            where: { slot_id: slotId, name: EDITOR_RATE_NAME, rent_type: 'hourly', deleted_at: null },
            data: { deleted_at: new Date(), is_active: false },
          });
          if (slot.hourly_rate_unit !== vehicleRates.get(slot.vehicle_type)) {
            await tx.rate_plans.create({
              data: {
                space_id: spaceId, slot_id: slotId, vehicle_type: slot.vehicle_type,
                name: EDITOR_RATE_NAME, rent_type: 'hourly', amount_unit: slot.hourly_rate_unit,
              },
            });
          }
        }
      }

      await this.growCapacity(tx, spaceId);
    }, { timeout: 30_000, maxWait: 10_000 }).catch((error: unknown) => {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A slot label in this camera was just used in this lot; reload and pick another label');
      }
      throw error;
    });

    return this.findOne(spaceId, cameraId);
  }

  // ── GET /spaces/:spaceId/cameras
  // All cameras of the lot with their slots, plus the lot's rate per vehicle type.

  async findAll(spaceId: string, user: JwtPayload) {
    await this.getManagedSpace(spaceId, user);
    const [cameras, vehicleRates] = await Promise.all([
      this.loadCameras(spaceId),
      this.vehicleRates(spaceId),
    ]);
    return {
      space_id: spaceId,
      vehicle_rates: [...vehicleRates].map(([vehicle_type, hourly_rate_unit]) => ({ vehicle_type, hourly_rate_unit })),
      cameras,
    };
  }

  // ── read one camera with its slots in pixel units

  async findOne(spaceId: string, cameraId: string) {
    const [camera] = await this.loadCameras(spaceId, cameraId);
    if (!camera) throw new NotFoundException('Camera not found');
    return camera;
  }

  private async loadCameras(spaceId: string, cameraId?: string) {
    const cameras = await this.prisma.cameras.findMany({
      where: { space_id: spaceId, deleted_at: null, ...(cameraId && { id: cameraId }) },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: {
        slots: { where: { deleted_at: null }, orderBy: [{ sort_order: 'asc' }, { slot_label: 'asc' }] },
      },
    });
    if (!cameras.length) return [];

    const [vehicleRates, slotRates] = await Promise.all([
      this.vehicleRates(spaceId),
      this.prisma.rate_plans.findMany({
        where: {
          space_id: spaceId, name: EDITOR_RATE_NAME, rent_type: 'hourly', deleted_at: null, is_active: true,
          slot_id: { in: cameras.flatMap((c) => c.slots.map((s) => s.id)) },
        },
        select: { slot_id: true, amount_unit: true },
      }),
    ]);
    const slotRate = new Map(slotRates.map((p) => [p.slot_id, p.amount_unit]));

    return cameras.map((camera) => ({
      id: camera.id,
      space_id: camera.space_id,
      label: camera.label,
      source_type: camera.source_type,
      rtsp_url: camera.rtsp_url,
      frame_width: camera.frame_width,
      frame_height: camera.frame_height,
      sort_order: camera.sort_order,
      status: camera.status,
      media_key: camera.media_key,
      media_type: camera.media_type,
      media_size: camera.media_size,
      last_heartbeat: camera.last_heartbeat,
      created_at: camera.created_at,
      updated_at: camera.updated_at,
      slots: camera.slots.map((slot) => {
        const vehicle = (slot.vehicle_types[0] as VehicleKind | undefined) ?? null;
        return {
          id: slot.id,
          camera_id: slot.camera_id,
          slot_label: slot.slot_label,
          vehicle_type: vehicle,
          hourly_rate_unit: slotRate.get(slot.id) ?? (vehicle ? vehicleRates.get(vehicle) : undefined) ?? null,
          bbox: this.toPixels(slot.bbox as NormalisedBox | null, camera.frame_width, camera.frame_height),
          status: slot.status,
          occupied: slot.occupied,
          confidence_score: slot.confidence_score,
          last_updated: slot.last_updated,
          plate_text: slot.plate_text,
          plate_confidence: slot.plate_confidence,
          plate_read_at: slot.plate_read_at,
          plate_check: slot.plate_check,
          created_at: slot.created_at,
          updated_at: slot.updated_at,
        };
      }),
    }));
  }

  // ── helpers

  private async getManagedSpace(spaceId: string, user: JwtPayload) {
    await this.spaces.assertOwnership(spaceId, user);
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id: spaceId, deleted_at: null },
      select: { id: true },
    });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  // the lot's hourly rate per vehicle type (plans without a slot)
  private async vehicleRates(spaceId: string) {
    const plans = await this.prisma.rate_plans.findMany({
      where: {
        space_id: spaceId, name: EDITOR_RATE_NAME, rent_type: 'hourly', slot_id: null,
        vehicle_type: { not: null }, deleted_at: null, is_active: true,
      },
      select: { vehicle_type: true, amount_unit: true },
    });
    return new Map(plans.map((p) => [p.vehicle_type as VehicleKind, p.amount_unit]));
  }

  // capacity only grows to fit the slots, so the slots API can still add slots up to the
  // owner's capacity; base_rate_unit is left alone because bookings charge it per hour
  private async growCapacity(tx: Transaction, spaceId: string) {
    const slotCount = await tx.parking_slots.count({ where: { space_id: spaceId, deleted_at: null } });
    await tx.parking_spaces.updateMany({
      where: { id: spaceId, total_capacity: { lt: slotCount } },
      data: { total_capacity: slotCount },
    });
  }

  private validateCamera(dto: { source_type: CameraSource; rtsp_url?: string | null }) {
    if (dto.source_type === CameraSource.rtsp && !/^rtsps?:\/\/\S+$/i.test(dto.rtsp_url?.trim() ?? '')) {
      throw new BadRequestException('An RTSP camera needs an rtsp:// URL.');
    }
  }

  // boxes inside the frame, no overlaps on this camera, labels unique in the request
  private validateSlots(slots: CameraSlotDto[], frame: { frame_width: number; frame_height: number }) {
    const errors: string[] = [];
    const labels: string[] = [];
    for (const [i, slot] of slots.entries()) {
      const label = slot.slot_label.toUpperCase();
      if (labels.includes(label)) throw new ConflictException(`Slot label ${label} is used twice.`);
      labels.push(label);

      const b = slot.bbox;
      if (b.x + b.width > frame.frame_width + 1e-6 || b.y + b.height > frame.frame_height + 1e-6) {
        errors.push(`Slot ${label} is outside the ${frame.frame_width}x${frame.frame_height} frame.`);
      }
      for (const other of slots.slice(0, i)) {
        if (this.overlaps(b, other.bbox)) errors.push(`Slots ${other.slot_label.toUpperCase()} and ${label} overlap.`);
      }
    }
    if (errors.length) throw new BadRequestException(errors);
    return labels;
  }

  // touching edges is allowed; only a positive shared area counts as overlap
  private overlaps(a: PixelBoxDto, b: PixelBoxDto) {
    const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return w > 1e-6 && h > 1e-6;
  }

  // slots store boxes as 0-1 fractions of the frame (same as the slots API)
  private toNormalised(b: PixelBoxDto, width: number, height: number): NormalisedBox {
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return {
      x1: clamp(b.x / width),
      y1: clamp(b.y / height),
      x2: clamp((b.x + b.width) / width),
      y2: clamp((b.y + b.height) / height),
    };
  }

  private toPixels(box: NormalisedBox | null, width: number | null, height: number | null) {
    if (!box || !width || !height) return null;
    const round = (v: number) => Math.round(v * 100) / 100;
    return {
      x: round(box.x1 * width),
      y: round(box.y1 * height),
      width: round((box.x2 - box.x1) * width),
      height: round((box.y2 - box.y1) * height),
    };
  }
}
