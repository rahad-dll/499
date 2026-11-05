/**
 * InferenceSchedulerService
 *
 * Runs every 10 minutes (configurable via INFERENCE_INTERVAL_MS env var).
 * bucket, it:
 *   1. Downloads each photo via presigned URL
 *   2. Sends to the AI inference API
 *   3. For an occupied or booked slot, reads the licence plate
 *   4. Upserts the result
 *
 * GET /spaces/nearby reads from parking_slots directly — instant response.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { basename, parse } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const SLOT_IMAGE_BUCKET = 'fixed-slot-image';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
              select: { id: true },
            });

            const image = await this.downloadPhoto(photo.s3_key);

            if (activeBooking) {
              this.logger.debug(`Skipping occupancy AI for ${photo.s3_key} — slot is booked`);
              // Mark as not_available in cache; the plate is still read to see which car is there
              const plate = await this.readPlate(space.id, slotLabel, image, photo.s3_key);
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
              ? await this.readPlate(space.id, slotLabel, image, photo.s3_key)
              : { plate_text: null, plate_confidence: null, plate_read_at: null };

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
      this.logger.log(`Inference cycle complete — ${updated} slots updated`);
    } finally {
      this.running = false;
    }
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

  private async postToAi(path: string, params: Record<string, string>, image: Buffer, filename: string) {
    const aiBaseUrl = this.config.get<string>('AI_INFERENCE_URL', 'http://localhost:8001');
    const aiToken = this.config.get<string>('AI_API_TOKEN', '');

    const aiEndpoint = new URL(path, aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`);
    for (const [key, value] of Object.entries(params)) aiEndpoint.searchParams.set(key, value);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), filename);

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
