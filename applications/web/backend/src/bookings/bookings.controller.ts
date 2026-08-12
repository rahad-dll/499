import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /bookings — create a booking
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(dto, user);
  }

  // GET /bookings — list driver's bookings
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.findAll(user);
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
}
