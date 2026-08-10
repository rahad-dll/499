import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { basename, parse } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

const SLOT_IMAGE_BUCKET = 'fixed-slot-image';

@Injectable()
export class SpacesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) { }

  // ── create ────────────────────────────────────────────────────────────────

  async create(dto: CreateSpaceDto, user: JwtPayload, photoKeys: string[]) {
    const { rtsp_url, ...spaceData } = dto;

    const space = await this.prisma.parking_spaces.create({
      data: {
        ...spaceData,
        owner_id: user.sub,
        amenities: dto.amenities ?? [],
        operating_hours: dto.operating_hours ?? undefined,
      },
    });

    // attach photos
    if (photoKeys.length > 0) {
      await this.prisma.space_photos.createMany({
        data: photoKeys.map((key, i) => ({
          space_id: space.id,
          s3_key: key,
          s3_bucket: 'local',
          is_primary: i === 0,
        })),
      });
    }

    // attach camera if RTSP URL provided
    if (rtsp_url) {
      await this.prisma.cameras.create({
        data: { space_id: space.id, rtsp_url, status: 'setup' },
      });
    }

    return this.findOne(space.id, user);
  }

  // ── list owner's spaces ───────────────────────────────────────────────────

  async findAll(user: JwtPayload) {
    return this.prisma.parking_spaces.findMany({
      where: { owner_id: user.sub, deleted_at: null },
      include: {
        photos: { select: { id: true, s3_key: true, is_primary: true } },
        cameras: { select: { id: true, rtsp_url: true, status: true } },
        _count: { select: { slots: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async searchNearby(lat: number, lng: number, radiusKm = 5) {
    if (!isFinite(lat) || !isFinite(lng)) {
      throw new BadRequestException('lat and lng are required');
    }
    if (!isFinite(radiusKm) || radiusKm <= 0) {
      radiusKm = 5;
    }

    const deltaLat = radiusKm / 111;
    const deltaLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const spaces = await this.prisma.parking_spaces.findMany({
      where: {
        deleted_at: null,
        latitude: { gte: lat - deltaLat, lte: lat + deltaLat },
        longitude: { gte: lng - deltaLng, lte: lng + deltaLng },
      },
      include: {
        photos: { select: { s3_bucket: true, s3_key: true } },
        cameras: { select: { id: true, rtsp_url: true, status: true } },
        slots: {
          where: { deleted_at: null },
          select: { slot_label: true, occupied: true, confidence_score: true, last_updated: true },
        },
        _count: { select: { slots: true, bookings: true } },
      },
    });

    const now = Date.now();

    const results = spaces.map((space) => {
      const distanceKm = this.getDistanceKm(lat, lng, space.latitude, space.longitude);

      // Read from cached parking_slots (updated by InferenceSchedulerService)
      const slotStatuses = space.slots.map((slot) => ({
        slot_id: `${space.id}-${slot.slot_label}`,
        status: slot.occupied ? 'not_available' : 'available',
        label: slot.occupied ? 'occupied' : 'empty',
        confidence: slot.confidence_score ?? 0,
        last_updated: slot.last_updated,
      }));

      const availableCount = slotStatuses.filter((s) => s.status === 'available').length;
      const occupiedCount = slotStatuses.filter((s) => s.status === 'not_available').length;
      const unknownCount = space._count.slots - slotStatuses.length;

      // Stale if no slots cached or last update > 10 min ago
      const oldestUpdate = space.slots.reduce(
        (min, s) => (s.last_updated ? Math.min(min, s.last_updated.getTime()) : min),
        now,
      );
      const isStale = space.slots.length === 0 || now - oldestUpdate > 10 * 60 * 1000;

      return {
        id: space.id,
        name: space.name,
        description: space.description,
        address: space.address,
        latitude: space.latitude,
        longitude: space.longitude,
        total_capacity: space.total_capacity,
        base_rate_unit: space.base_rate_unit,
        amenities: space.amenities,
        status: space.status,
        distance_km: distanceKm,
        available_slots: availableCount,
        occupied_slots: occupiedCount,
        unknown_slots: unknownCount,
        slot_statuses: slotStatuses,
        is_stale: isStale,
        photo_count: space.photos.length,
        camera_count: space.cameras.length,
        slot_count: space._count.slots,
        booking_count: space._count.bookings,
      };
    });

    return results
      .filter((space) => space.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }

  private getS3Client(): S3Client {
    return new S3Client({
      endpoint: this.config.get<string>('STORAGE_ENDPOINT', 'https://i3z8.sg03.idrivee2-95.com'),
      region: this.config.get<string>('STORAGE_REGION', 'ap-southeast-1'),
      credentials: {
        accessKeyId: this.config.get<string>('STORAGE_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('STORAGE_SECRET_ACCESS_KEY', ''),
      },
      forcePathStyle: false, // virtual-hosted: bucket.endpoint.com/key
    });
  }

  private async inferSlotImageFromS3(spaceId: string, s3Key: string) {
    const slotId = `${spaceId}-${parse(s3Key).name}`;
    const aiBaseUrl = this.config.get<string>('AI_INFERENCE_URL', 'http://localhost:8001');
    const aiToken = this.config.get<string>('AI_API_TOKEN', 'change-me-in-production');

    const endpoint = new URL(
      '/api/v1/inference/predict',
      aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`,
    );
    endpoint.searchParams.set('space_id', spaceId);
    endpoint.searchParams.set('slot_id', slotId);
    endpoint.searchParams.set('model', 'occupancy');

    try {
      // Generate presigned URL (valid 5 min) — avoids SDK SSL issues
      const s3 = this.getS3Client();
      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: SLOT_IMAGE_BUCKET, Key: s3Key }),
        { expiresIn: 300 },
      );

      // Download image bytes via fetch using the presigned URL
      const imgResponse = await fetch(presignedUrl, {
        signal: AbortSignal.timeout(60_000),
      });
      if (!imgResponse.ok) {
        throw new Error(`S3 download failed: ${imgResponse.status}`);
      }
      const imageBuffer = Buffer.from(await imgResponse.arrayBuffer());

      // Send to AI inference API
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([imageBuffer], { type: 'image/jpeg' }),
        basename(s3Key),
      );

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${aiToken}` },
        body: formData,
        signal: AbortSignal.timeout(90_000),
      });

      if (!response.ok) {
        return { slot_id: slotId, status: 'unknown', label: 'unknown', confidence: 0, error: `AI ${response.status}` };
      }

      const payload = (await response.json()) as {
        prediction?: { label?: string; confidence?: number };
        label?: string;
        confidence?: number;
      };

      const label = (payload.prediction?.label ?? payload.label ?? 'unknown').toLowerCase();
      const confidence = payload.prediction?.confidence ?? payload.confidence ?? 0;
      const status = (label === 'occupied' && confidence >= 0.9) ? 'not_available' : 'available';

      return { slot_id: slotId, status, label, confidence };
    } catch (err) {
      console.error(`[inferSlotImageFromS3] spaceId=${spaceId} key=${s3Key} error:`, err instanceof Error ? err.message : err);
      return { slot_id: slotId, status: 'unknown', label: 'unknown', confidence: 0 };
    }
  }

  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  // ── get one ────────────────────────────────────────────────────────────────

  async findOne(id: string, user: JwtPayload) {
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id, deleted_at: null },
      include: {
        photos: true,
        cameras: {
          select: { id: true, label: true, rtsp_url: true, status: true },
        },
        _count: { select: { slots: true, bookings: true } },
      },
    });

    if (!space) throw new NotFoundException('Space not found');

    // owners only see their own; admin can see all
    if (user.role !== 'admin' && space.owner_id !== user.sub) {
      throw new ForbiddenException();
    }

    return space;
  }

  // ── update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateSpaceDto, user: JwtPayload) {
    await this.assertOwnership(id, user);

    const { rtsp_url, ...spaceData } = dto;

    const space = await this.prisma.parking_spaces.update({
      where: { id },
      data: spaceData,
    });

    // if RTSP provided, upsert first camera
    if (rtsp_url !== undefined) {
      const existing = await this.prisma.cameras.findFirst({
        where: { space_id: id },
      });
      if (existing) {
        await this.prisma.cameras.update({
          where: { id: existing.id },
          data: { rtsp_url },
        });
      } else {
        await this.prisma.cameras.create({
          data: { space_id: id, rtsp_url, status: 'setup' },
        });
      }
    }

    return space;
  }

  // ── delete (soft) ──────────────────────────────────────────────────────────

  async remove(id: string, user: JwtPayload) {
    await this.assertOwnership(id, user);
    await this.prisma.parking_spaces.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Space deleted' };
  }

  // ── AI inference ────────────────────────────────────────────────────────

  async inferOccupancy(
    id: string,
    user: JwtPayload,
    file: Express.Multer.File,
  ) {
    await this.assertOwnership(id, user);

    const aiBaseUrl = this.config.get<string>(
      'AI_INFERENCE_URL',
      'http://localhost:8001',
    );
    const aiToken = this.config.get<string>(
      'AI_API_TOKEN',
      'change-me-in-production',
    );
    const endpoint = new URL(
      '/api/v1/inference/predict',
      aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`,
    );
    endpoint.searchParams.set('space_id', id);
    endpoint.searchParams.set('slot_id', `${id}-slot`);
    endpoint.searchParams.set('model', 'occupancy');

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || 'application/octet-stream',
      }),
      file.originalname || 'slot-image.jpg',
    );

    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiToken}` },
      body: formData,
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadRequestException(`AI inference failed: ${message}`);
    }

    const payload = (await response.json()) as {
      prediction?: { label?: string; confidence?: number };
      label?: string;
      confidence?: number;
    };

    const label = (
      payload.prediction?.label ??
      payload.label ??
      'unknown'
    ).toLowerCase();
    const confidence =
      payload.prediction?.confidence ?? payload.confidence ?? 0;
    const status =
      label === 'empty'
        ? 'available'
        : label === 'occupied'
          ? 'not_available'
          : 'unknown';

    return {
      space_id: id,
      status,
      label,
      confidence,
      source: 'ai',
    };
  }

  // ── photos ─────────────────────────────────────────────────────────────────

  async addPhotos(id: string, user: JwtPayload, photoKeys: string[]) {
    await this.assertOwnership(id, user);
    const hasPhotos = await this.prisma.space_photos.count({
      where: { space_id: id },
    });

    await this.prisma.space_photos.createMany({
      data: photoKeys.map((key, i) => ({
        space_id: id,
        s3_key: key,
        s3_bucket: 'local',
        is_primary: hasPhotos === 0 && i === 0,
      })),
    });

    return { added: photoKeys.length };
  }

  async getPhotoPresignedUrl(
    spaceId: string,
    photoId: string,
    user: JwtPayload,
  ) {
    await this.assertOwnership(spaceId, user);

    const photo = await this.prisma.space_photos.findFirst({
      where: { id: photoId, space_id: spaceId },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    if (!photo.s3_bucket || !photo.s3_key) {
      throw new BadRequestException('Photo is not stored in object storage');
    }
    if (photo.s3_bucket === 'local') {
      throw new BadRequestException(
        'Cannot generate presigned URL for local storage photos',
      );
    }

    const endpoint = this.config.get<string>('STORAGE_ENDPOINT');
    const region = this.config.get<string>('STORAGE_REGION');
    const accessKeyId = this.config.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('STORAGE_SECRET_ACCESS_KEY');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      throw new Error('Storage configuration is not set');
    }

    const s3 = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    const command = new GetObjectCommand({
      Bucket: photo.s3_bucket,
      Key: photo.s3_key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return { url };
  }

  async deletePhoto(spaceId: string, photoId: string, user: JwtPayload) {
    await this.assertOwnership(spaceId, user);
    const photo = await this.prisma.space_photos.findFirst({
      where: { id: photoId, space_id: spaceId },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    await this.prisma.space_photos.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
  }

  // ── helper ─────────────────────────────────────────────────────────────────

  private async assertOwnership(id: string, user: JwtPayload) {
    if (user.role === 'admin') return;
    const space = await this.prisma.parking_spaces.findFirst({
      where: { id, deleted_at: null },
      select: { owner_id: true },
    });
    if (!space) throw new NotFoundException('Space not found');
    if (space.owner_id !== user.sub) throw new ForbiddenException();
  }
}
