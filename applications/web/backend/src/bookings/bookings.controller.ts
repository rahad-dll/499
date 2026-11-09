import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, QuoteBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CheckInDto, ExtendBookingDto } from './dto/booking-lifecycle.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /bookings/quote — price before booking; nothing is held
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Price a booking before making it',
    description:
      'Returns the slot POST /bookings would give right now and its price. ' +
      'Hourly rate, most specific first: the slot\'s own price, then the lot\'s rate for the slot\'s vehicle type, then the lot\'s base price. ' +
      'Amounts in paisa (5000 = 50 BDT); total_price in BDT. Nothing is reserved, so the slot can be taken before booking.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        space_id: '6f1c2a9e-4b7d-4e2a-9c1f-3a5b7d9e1f20', slot_id: '1d9e4f2a-0b3c-4d5e-8f60-7a8b9c0d1e2f', slot_label: 'A01',
        scheduled_at: '2026-11-09T10:00:00.000Z', end_at: '2026-11-09T12:00:00.000Z', duration_hours: 2,
        hourly_rate_unit: 5000, rate_source: 'vehicle', base_amount_unit: 10000, discount_unit: 0, amount_unit: 10000, total_price: 100,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Lot not found or not approved; slot not in this lot' })
  @ApiConflictResponse({ description: 'Slot not free, or no free slot for this time' })
  @HttpCode(200)
  @Post('quote')
  quote(@Body() dto: QuoteBookingDto) {
    return this.bookingsService.quote(dto);
  }

  // POST /bookings — create a booking
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 CHANGED 08 Nov · Create a booking (price from slot / vehicle rate)',
    description:
      'The price is worked out on the server with the same rule as POST /bookings/quote. ' +
      'The response now also has base_amount_unit and discount_unit; price_per_hour is the rate actually charged.',
  })
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(dto, user);
  }

  // GET /bookings — list driver's bookings, newest first, one page at a time
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 CHANGED 08 Nov · My bookings, with filters and paging',
    description:
      'Filters: status (one or comma-separated), from / to on the start time. ' +
      'Paging: page (default 1), limit (default 50, max 100). ' +
      'Response is now { data, page, limit, total } instead of a bare list.',
  })
  @ApiOkResponse({
    schema: {
      example: { data: [{ id: 'b430942a-7f74-478d-8cfe-82a71ac60323', slot_label: 'A02', status: 'confirmed', total_price: 100 }], page: 1, limit: 50, total: 1 },
    },
  })
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListBookingsQueryDto) {
    return this.bookingsService.findAll(user, query);
  }

  // GET /bookings/:id
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.findOne(id, user);
  }

  // PATCH /bookings/:id/cancel
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.cancel(id, user);
  }

  // POST /bookings/:id/check-in — mark arrival
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Check in (arrived at the slot)',
    description:
      'Only a confirmed booking, from 15 minutes before its start until its end. ' +
      'If the slot has a QR code, send qr_code from the sticker; otherwise send latitude and longitude ' +
      '(must be within 200 m of the lot). Sets arrived_at.',
  })
  @ApiBadRequestResponse({ description: 'Wrong status, too early, already ended, wrong QR code, or too far away' })
  @ApiConflictResponse({ description: 'Already checked in' })
  @Post(':id/check-in')
  @HttpCode(200)
  checkIn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckInDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.checkIn(id, dto, user);
  }

  // POST /bookings/:id/check-out — mark departure, complete the booking
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Check out (left the slot)',
    description:
      'Needs a check-in first. Sets departed_at and status completed. Leaving more than 10 minutes after the ' +
      'booked end is charged per started hour at the booking\'s hourly rate (overstay_hours, overstay_unit; ' +
      'added to amount_unit).',
  })
  @ApiOkResponse({ schema: { example: { id: 'b430942a-…', status: 'completed', departed_at: '2026-11-09T12:20:00.000Z', amount_unit: 15000, overstay_hours: 1, overstay_unit: 5000 } } })
  @ApiBadRequestResponse({ description: 'Not checked in' })
  @ApiConflictResponse({ description: 'Already checked out' })
  @Post(':id/check-out')
  @HttpCode(200)
  checkOut(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.checkOut(id, user);
  }

  // POST /bookings/:id/extend — add hours on the same slot
  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Extend a booking',
    description:
      'Adds extra_hours on the same slot if nobody has booked it right after; the whole booking stays within 24 hours. ' +
      'The extra hours are priced like a new booking (slot price, vehicle rate, then lot price) and added to the amounts. ' +
      'Moves end_at / hold_expires_at and sets extended_to.',
  })
  @ApiBadRequestResponse({ description: 'Wrong status, already checked out, ended without check-in, or over 24 hours' })
  @ApiConflictResponse({ description: 'The slot is booked by someone else in the extra time' })
  @Post(':id/extend')
  @HttpCode(200)
  extend(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ExtendBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.extend(id, dto, user);
  }

  // DELETE /bookings/:id — hide from the driver's history (soft delete)
  @Delete(':id')
  hide(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.hide(id, user);
  }
}
