import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCameraDto } from './dto/camera.dto';
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
}
