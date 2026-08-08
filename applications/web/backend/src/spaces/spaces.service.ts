import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, join, parse } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

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
        _count: { select: { slots: true, bookings: true } },
      },
    });

    const backendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3001').replace(/\/$/, '');

    const results = await Promise.all(
      spaces.map(async (space) => {
        const distanceKm = this.getDistanceKm(lat, lng, space.latitude, space.longitude);
        const slotFiles = this.getLocalSlotFiles(space.id);
        const slotStatuses = await Promise.all(
          slotFiles.map(async (slotFile) => {
            return this.inferSlotImage(space.id, slotFile);
          }),
        );

        const availableCount = slotStatuses.filter((item) => item.status === 'available').length;
        const occupiedCount = slotStatuses.filter((item) => item.status === 'not_available').length;
        const unknownCount = slotStatuses.filter((item) => item.status === 'unknown').length;

        return {
          id: space.id,
          name: space.name,
          description: space.description,
          address: space.address,
          latitude: space.latitude,
          longitude: space.longitude,
          total_capacity: space.total_capacity,
          status: space.status,
          distance_km: distanceKm,
          available_slots: availableCount,
          occupied_slots: occupiedCount,
          unknown_slots: unknownCount,
          slot_statuses: slotStatuses,
          photo_count: space.photos.length,
          camera_count: space.cameras.length,
          slot_count: space._count.slots,
          booking_count: space._count.bookings,
        };
      }),
    );

    return results
      .filter((space) => space.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }

  private getLocalSlotFiles(spaceId: string) {
    const folder = join(process.cwd(), 'uploads', 'spaces', spaceId);
    if (!existsSync(folder) || !statSync(folder).isDirectory()) {
      return [];
    }

    return readdirSync(folder)
      .filter((entry) => !entry.startsWith('.') && !statSync(join(folder, entry)).isDirectory())
      .map((entry) => join(folder, entry));
  }

  private async inferSlotImage(spaceId: string, filePath: string) {
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
    const slotId = `${spaceId}-${parse(filePath).name}`;
    endpoint.searchParams.set('space_id', spaceId);
    endpoint.searchParams.set('slot_id', slotId);
    endpoint.searchParams.set('model', 'occupancy');

    try {
      const fileBuffer = readFileSync(filePath);
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([fileBuffer], { type: 'image/jpeg' }),
        basename(filePath),
      );

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${aiToken}` },
        body: formData,
        signal: AbortSignal.timeout(90_000),
      });

      if (!response.ok) {
        return {
          slot_id: slotId,
          status: 'unknown',
          label: 'unknown',
          confidence: 0,
          error: `AI inference failed with ${response.status}`,
        };
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
        slot_id: slotId,
        status,
        label,
        confidence,
      };
    } catch {
      return {
        slot_id: slotId,
        status: 'unknown',
        label: 'unknown',
        confidence: 0,
      };
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
