import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  BulkCreateSlotsDto,
  BulkUpdateSlotsDto,
  CreateSlotDto,
  ListSlotsQueryDto,
  UpdateSlotDto,
} from './dto/slot.dto';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@ApiBearerAuth()
@Controller('spaces/:spaceId/slots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SlotsController {
  constructor(private slotsService: SlotsService) { }

  // POST /spaces/:spaceId/slots — one slot
  @Post()
  create(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateSlotDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.create(spaceId, dto, user);
  }

  // POST /spaces/:spaceId/slots/bulk — prefix + count
  @Post('bulk')
  bulkCreate(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: BulkCreateSlotsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.bulkCreate(spaceId, dto, user);
  }

  // GET /spaces/:spaceId/slots?zone=&floor=&slot_type=&status=&vehicle_type=&from=&to=
  @Get()
  findAll(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query() query: ListSlotsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.findAll(spaceId, query, user);
  }

  // PATCH /spaces/:spaceId/slots — same change to many slots
  @Patch()
  bulkUpdate(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: BulkUpdateSlotsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.bulkUpdate(spaceId, dto, user);
  }

  // GET /spaces/:spaceId/slots/:slotId
  @Get(':slotId')
  findOne(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.findOne(spaceId, slotId, user);
  }

  // PATCH /spaces/:spaceId/slots/:slotId
  @Patch(':slotId')
  update(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateSlotDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.update(spaceId, slotId, dto, user);
  }

  // DELETE /spaces/:spaceId/slots/:slotId
  @Delete(':slotId')
  remove(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.slotsService.remove(spaceId, slotId, user);
  }
}
