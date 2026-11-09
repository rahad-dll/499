import { Module } from '@nestjs/common';
import { BookingJobsController } from './booking-jobs.controller';
import { BookingJobsService } from './booking-jobs.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController, BookingJobsController],
  providers: [BookingsService, BookingJobsService],
})
export class BookingsModule {}
