import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

  // PUT /spaces/:spaceId/cameras/:cameraId/frame — upload the camera's latest picture and read its slots
  @Put(':cameraId/frame')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary', description: 'JPEG or PNG, up to 10 MB' } },
    },
  })
  uploadFrame(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('cameraId', ParseUUIDPipe) cameraId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.camerasService.uploadFrame(spaceId, cameraId, file, user);
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
