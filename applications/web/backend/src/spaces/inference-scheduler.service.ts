/**
 * InferenceSchedulerService
 *
 * Runs every 10 minutes (configurable via INFERENCE_INTERVAL_MS env var).
 * bucket, it:
 *   1. Downloads each photo via presigned URL
 *   2. Sends to the AI inference API
 *   3. For an occupied or booked slot, reads the licence plate
 *   4. Upserts the result
 * It also reads the latest picture of each camera for the slots drawn on it.
 *
 * GET /spaces/nearby reads from parking_slots directly — instant response.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { basename, parse } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { plate_check } from '../generated/prisma/enums.js';
import { comparePlates } from './plate-match';

const SLOT_IMAGE_BUCKET = 'fixed-slot-image';
const CAMERA_FRAME_FOLDER = 'camera-frames';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type FrameSlotResult = {
  slot_id: string;
  prediction?: { label?: string; confidence?: number };
  plates?: { text_en?: string; confidence?: number }[];
};

@Injectable()
export class InferenceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(InferenceSchedulerService.name);
  private intervalMs: number;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.intervalMs = Number(
      this.config.get<string>('INFERENCE_INTERVAL_MS', String(DEFAULT_INTERVAL_MS)),
    );
  }

  onModuleInit() {
    // Run once on startup, then on interval
    this.runCycle().catch((e) => this.logger.error('Initial cycle failed', e));
    setInterval(() => {
      this.runCycle().catch((e) => this.logger.error('Scheduled cycle failed', e));
    }, this.intervalMs);
  }

  async runCycle() {
    if (this.running) {
      this.logger.debug('Previous cycle still running — skipping');
      return;
    }
    this.running = true;
    this.logger.log('Inference cycle started');

    try {
      const spaces = await this.prisma.parking_spaces.findMany({
        where: { deleted_at: null, status: 'active' },
        include: {
          photos: {
            where: { s3_bucket: SLOT_IMAGE_BUCKET, deleted_at: null },
            select: { s3_key: true },
          },
        },
      });

      let updated = 0;
      const now = new Date();

      for (const space of spaces) {
        if (space.photos.length === 0) continue;
        for (const photo of space.photos) {
          try {
            const slotLabel = parse(photo.s3_key).name; // e.g. "slot-1"

            // Skip AI inference if slot has an active booking right now
            const activeBooking = await this.prisma.bookings.findFirst({
              where: {
                space_id: space.id,
                deleted_at: null,
                status: { in: ['confirmed', 'pending'] },
                scheduled_at: { lte: now },
                hold_expires_at: { gte: now },
                slot: { slot_label: slotLabel },
              },
              select: { id: true, vehicle_plate: true },
            });

            const image = await this.downloadPhoto(photo.s3_key);

            if (activeBooking) {
              this.logger.debug(`Skipping occupancy AI for ${photo.s3_key} — slot is booked`);
              // Mark as not_available in cache; the plate is still read to see which car is there
              const plate = this.withPlateCheck(
                await this.readPlate(space.id, slotLabel, image, photo.s3_key),
                activeBooking,
              );
              await this.prisma.parking_slots.upsert({
                where: { space_id_slot_label: { space_id: space.id, slot_label: slotLabel } },
                update: { occupied: true, last_updated: now, ...plate },
                create: { space_id: space.id, slot_label: slotLabel, occupied: true, last_updated: now, ...plate },
              });
              updated++;
              continue;
            }

            const result = await this.inferPhoto(space.id, photo.s3_key, image);
            const occupied = result.status === 'not_available';
            // an empty slot clears the last plate so a car that left is not shown
            const plate = occupied
              ? this.withPlateCheck(await this.readPlate(space.id, slotLabel, image, photo.s3_key), null)
              : { plate_text: null, plate_confidence: null, plate_read_at: null, plate_check: null };

            await this.prisma.parking_slots.upsert({
              where: { space_id_slot_label: { space_id: space.id, slot_label: slotLabel } },
              update: {
                occupied,
                confidence_score: result.confidence,
                last_updated: new Date(),
                ...plate,
              },
              create: {
                space_id: space.id,
                slot_label: slotLabel,
                occupied,
                confidence_score: result.confidence,
                last_updated: new Date(),
                ...plate,
              },
            });
            updated++;
          } catch (e) {
            this.logger.warn(`Failed slot ${photo.s3_key}: ${e instanceof Error ? e.message : e}`);
          }
        }
      }

      // cameras with an uploaded picture; with the demo video on, every camera that has slots
      const cameras = await this.prisma.cameras.findMany({
        where: {
          deleted_at: null,
          space: { deleted_at: null, status: 'active' },
          ...(this.demoVideoOn() ? { slots: { some: { deleted_at: null } } } : { frame_key: { not: null } }),
        },
        select: { id: true },
      });
      for (const camera of cameras) {
        try {
          updated += await this.analyseCamera(camera.id);
        } catch (e) {
          this.logger.warn(`Failed camera ${camera.id}: ${e instanceof Error ? e.message : e}`);
        }
      }
      this.logger.log(`Inference cycle complete — ${updated} slots updated`);
    } finally {
      this.running = false;
    }
  }

  /** Saves a camera's latest picture and returns its storage key. */
  async storeCameraFrame(cameraId: string, image: Buffer, type: string): Promise<string> {
    const key = `${CAMERA_FRAME_FOLDER}/${cameraId}.${type === 'image/png' ? 'png' : 'jpg'}`;
    await this.getS3Client().send(
      new PutObjectCommand({ Bucket: SLOT_IMAGE_BUCKET, Key: key, Body: image, ContentType: type }),
    );
    return key;
  }

  /** The shared demo video is used for cameras without an uploaded picture unless DEMO_VIDEO=false. */
  demoVideoOn(): boolean {
    return this.config.get<string>('DEMO_VIDEO', 'true').toLowerCase() !== 'false';
  }

  private videoInfo: { at: number; value: { url: string; duration_s: number; clock_start: string } | null } | null = null;

  /** Where the apps play the demo video and its shared clock; asked from the AI service once an hour. */
  async demoVideo(): Promise<{ url: string; duration_s: number; clock_start: string } | null> {
    if (!this.demoVideoOn()) return null;
    if (this.videoInfo && Date.now() - this.videoInfo.at < 60 * 60 * 1000) return this.videoInfo.value;
    const base = this.config.get<string>('AI_INFERENCE_URL', 'http://localhost:8001').replace(/\/$/, '');
    let value: { url: string; duration_s: number; clock_start: string } | null = null;
    try {
      const r = await fetch(`${base}/api/v1/inference/video`, {
        headers: { Authorization: `Bearer ${this.config.get<string>('AI_API_TOKEN', '')}` },
        signal: AbortSignal.timeout(90_000),
      });
      if (r.ok) {
        const v = (await r.json()) as { duration_s: number; clock_start: string };
        value = { url: `${base}/demo-video.mp4`, duration_s: v.duration_s, clock_start: v.clock_start };
      }
    } catch (e) {
      this.logger.warn(`Demo video info failed: ${e instanceof Error ? e.message : e}`);
    }
    this.videoInfo = { at: Date.now(), value };
    return value;
  }

  /**
   * Reads a camera: its latest uploaded picture, or with no picture the shared demo video at the
   * current moment. Saves occupancy of each slot and the plate of each occupied slot. Returns the
   * number of slots updated.
   */
  async analyseCamera(cameraId: string, image?: Buffer): Promise<number> {
    const camera = await this.prisma.cameras.findFirst({
      where: { id: cameraId, deleted_at: null },
      include: { slots: { where: { deleted_at: null }, select: { id: true, bbox: true } } },
    });
    const useVideo = !!camera && !camera.frame_key && !image && this.demoVideoOn();
    if (!camera || (!camera.frame_key && !useVideo)) return 0;

    const slots = camera.slots.flatMap((slot) => {
      const b = slot.bbox as { x1?: number; y1?: number; x2?: number; y2?: number } | null;
      const ok = b && [b.x1, b.y1, b.x2, b.y2].every((v) => typeof v === 'number') && b.x2! > b.x1! && b.y2! > b.y1!;
      return ok ? [{ slot_id: slot.id, x1: b.x1!, y1: b.y1!, x2: b.x2!, y2: b.y2! }] : [];
    });
    if (!slots.length) return 0;

    let payload: { slots?: FrameSlotResult[] };
    if (useVideo) {
      payload = (await this.postJsonToAi('/api/v1/inference/video-frame', {
        space_id: camera.space_id,
        camera_id: camera.id,
        slots,
      })) as { slots?: FrameSlotResult[] };
    } else {
      const frame = image ?? (await this.downloadPhoto(camera.frame_key!));
      payload = (await this.postToAi(
        '/api/v1/inference/frame',
        { space_id: camera.space_id, camera_id: camera.id },
        frame,
        basename(camera.frame_key!),
        { slots: JSON.stringify(slots) },
      )) as { slots?: FrameSlotResult[] };
    }

    const now = new Date();
    let updated = 0;
    for (const result of payload.slots ?? []) {
      const booking = await this.prisma.bookings.findFirst({
        where: {
          slot_id: result.slot_id,
          deleted_at: null,
          status: { in: ['confirmed', 'pending'] },
          scheduled_at: { lte: now },
          hold_expires_at: { gte: now },
        },
        select: { id: true, vehicle_plate: true },
      });

      const label = (result.prediction?.label ?? 'unknown').toLowerCase();
      const confidence = result.prediction?.confidence ?? 0;
      // a booked slot counts as taken; otherwise only a confident AI read marks it occupied
      const occupied = !!booking || (label === 'occupied' && confidence >= 0.9);
      const best = result.plates?.find((p) => p.text_en);
      const plate = occupied
        ? this.withPlateCheck(
          { plate_text: best?.text_en ?? null, plate_confidence: best?.confidence ?? null, plate_read_at: now },
          booking,
        )
        : { plate_text: null, plate_confidence: null, plate_read_at: null, plate_check: null };

      await this.prisma.parking_slots.update({
        where: { id: result.slot_id },
        data: {
          occupied,
          ...(booking ? {} : { confidence_score: confidence }),
          last_updated: now,
          ...plate,
        },
      });
      updated++;
    }
    return updated;
  }

  private getS3Client(): S3Client {
    return new S3Client({
      endpoint: this.config.get<string>('STORAGE_ENDPOINT', 'https://i3z8.sg03.idrivee2-95.com'),
      region: this.config.get<string>('STORAGE_REGION', 'ap-southeast-1'),
      credentials: {
        accessKeyId: this.config.get<string>('STORAGE_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('STORAGE_SECRET_ACCESS_KEY', ''),
      },
      forcePathStyle: false,
    });
  }

  // Presigned URL → fetch bytes; downloaded once per slot and sent to both AI calls
  private async downloadPhoto(s3Key: string): Promise<Buffer> {
    const s3 = this.getS3Client();
    const presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: SLOT_IMAGE_BUCKET, Key: s3Key }),
      { expiresIn: 300 },
    );

    const imgResponse = await fetch(presignedUrl, { signal: AbortSignal.timeout(60_000) });
    if (!imgResponse.ok) throw new Error(`S3 ${imgResponse.status} for ${s3Key}`);
    return Buffer.from(await imgResponse.arrayBuffer());
  }

  private async postJsonToAi(path: string, body: unknown) {
    const aiBaseUrl = this.config.get<string>('AI_INFERENCE_URL', 'http://localhost:8001');
    const url = new URL(path, aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`);
    const aiResponse = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.get<string>('AI_API_TOKEN', '')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    if (!aiResponse.ok) throw new Error(`AI ${aiResponse.status}`);
    return aiResponse.json() as Promise<unknown>;
  }

  private async postToAi(
    path: string,
    params: Record<string, string>,
    image: Buffer,
    filename: string,
    fields: Record<string, string> = {},
  ) {
    const aiBaseUrl = this.config.get<string>('AI_INFERENCE_URL', 'http://localhost:8001');
    const aiToken = this.config.get<string>('AI_API_TOKEN', '');

    const aiEndpoint = new URL(path, aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`);
    for (const [key, value] of Object.entries(params)) aiEndpoint.searchParams.set(key, value);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), filename);
    for (const [key, value] of Object.entries(fields)) formData.append(key, value);

    const aiResponse = await fetch(aiEndpoint.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiToken}` },
      body: formData,
      signal: AbortSignal.timeout(90_000),
    });
    if (!aiResponse.ok) throw new Error(`AI ${aiResponse.status}`);
    return aiResponse.json() as Promise<unknown>;
  }

  /**
   * Reads the licence plate of the car in a slot. Returns the most confident plate,
   * or empty fields when none is found. A failed read never blocks the occupancy update.
   */
  private async readPlate(spaceId: string, slotLabel: string, image: Buffer, s3Key: string) {
    try {
      const payload = (await this.postToAi(
        '/api/v1/inference/plate',
        { space_id: spaceId, slot_id: `${spaceId}-${slotLabel}` },
        image,
        basename(s3Key),
      )) as { plates?: { text_en?: string; confidence?: number }[] };

      const best = payload.plates?.find((p) => p.text_en);
      return {
        plate_text: best?.text_en ?? null,
        plate_confidence: best?.confidence ?? null,
        plate_read_at: new Date(),
      };
    } catch (e) {
      this.logger.warn(`Plate read failed for ${s3Key}: ${e instanceof Error ? e.message : e}`);
      return {};
    }
  }

  /**
   * Compares the plate read with the current booking's vehicle plate, in English or Bangla.
   * A failed read ({}) leaves the last check untouched.
   */
  private withPlateCheck(
    plate: { plate_text?: string | null; plate_confidence?: number | null; plate_read_at?: Date | null },
    booking: { vehicle_plate: string | null } | null,
  ) {
    if (!('plate_text' in plate)) return plate;

    let plate_check: plate_check;
    if (!plate.plate_text?.trim()) plate_check = 'unknown';
    else if (!booking) plate_check = 'no_booking';
    else plate_check = comparePlates(plate.plate_text, booking.vehicle_plate);

    return { ...plate, plate_check };
  }

  private async inferPhoto(spaceId: string, s3Key: string, image: Buffer) {
    const payload = (await this.postToAi(
      '/api/v1/inference/predict',
      { space_id: spaceId, slot_id: `${spaceId}-${parse(s3Key).name}`, model: 'occupancy' },
      image,
      basename(s3Key),
    )) as {
      prediction?: { label?: string; confidence?: number };
      label?: string; confidence?: number;
    };
    const label = (payload.prediction?.label ?? payload.label ?? 'unknown').toLowerCase();
    const confidence = payload.prediction?.confidence ?? payload.confidence ?? 0;
    // Only mark as occupied if confidence >= 90%, otherwise treat as available
    const status = (label === 'occupied' && confidence >= 0.9) ? 'not_available' : 'available';

    return { status, label, confidence };
  }
}
