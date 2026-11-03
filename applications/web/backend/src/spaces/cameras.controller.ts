import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';
import { CamerasService } from './cameras.service';

@ApiTags('cameras')
@ApiBearerAuth()
@Controller('spaces/:spaceId/cameras')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CamerasController {
  constructor(private camerasService: CamerasService) { }

  // POST /spaces/:spaceId/cameras — add one camera with its slots
  @Post()
  create(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateCameraDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.camerasService.create(spaceId, dto, user);
  }

  // PATCH /spaces/:spaceId/cameras/:cameraId — change one camera, add or update its slots
  @Patch(':cameraId')
  update(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('cameraId', ParseUUIDPipe) cameraId: string,
    @Body() dto: UpdateCameraDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.camerasService.update(spaceId, cameraId, dto, user);
  }

  // GET /spaces/:spaceId/cameras — all cameras with their slots and the lot's vehicle rates
  @Get()
  findAll(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.camerasService.findAll(spaceId, user);
  }
}
