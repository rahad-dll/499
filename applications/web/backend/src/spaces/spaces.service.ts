import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

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
