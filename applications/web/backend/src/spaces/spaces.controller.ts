import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

// photos land in uploads/spaces/ relative to cwd
const photoStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'spaces'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@Controller('spaces')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpacesController {
  constructor(private spacesService: SpacesService) {}

  // POST /spaces  — create with optional photos
  @Post()
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: photoStorage }))
  create(
    @Body() dto: CreateSpaceDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    const photoKeys = (files ?? []).map((f) => f.filename);
    return this.spacesService.create(dto, user, photoKeys);
  }

  // GET /spaces — list caller's spaces
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.spacesService.findAll(user);
  }

  // GET /spaces/:id
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.spacesService.findOne(id, user);
  }

  // PATCH /spaces/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.spacesService.update(id, dto, user);
  }

  // DELETE /spaces/:id
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.spacesService.remove(id, user);
  }

  // POST /spaces/:id/infer — run AI inference on uploaded image
  @Post(':id/infer')
  @UseInterceptors(FileInterceptor('file'))
  inferOccupancy(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.spacesService.inferOccupancy(id, user, file);
  }

  // POST /spaces/:id/photos — add more photos later
  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: photoStorage }))
  addPhotos(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.spacesService.addPhotos(
      id,
      user,
      files.map((f) => f.filename),
    );
  }

  // DELETE /spaces/:id/photos/:photoId
  @Delete(':id/photos/:photoId')
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.spacesService.deletePhoto(id, photoId, user);
  }
}
