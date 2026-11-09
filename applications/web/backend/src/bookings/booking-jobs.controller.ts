import { Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { Public } from '../auth/decorators/public.decorator';
import { BookingJobsService } from './booking-jobs.service';

// Called by an outside scheduler (e.g. cron-job.org every 5 minutes) with the JOB_TOKEN secret.
@ApiTags('internal jobs')
@Controller('internal/jobs')
export class BookingJobsController {
  constructor(
    private readonly jobs: BookingJobsService,
    private readonly config: ConfigService,
  ) {}

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Run the booking job now (for an outside cron)',
    description:
      'Cancels unpaid holds older than 15 minutes, marks confirmed bookings whose time passed without check-in as no_show, ' +
      'and completes checked-in bookings 60 minutes after their end. The same job also runs inside the server every 5 minutes. ' +
      'Needs the X-Job-Token header (JOB_TOKEN in .env); not for apps.',
  })
  @ApiHeader({ name: 'X-Job-Token', required: true })
  @ApiOkResponse({ schema: { example: { expired_holds: 0, no_shows: 3, auto_completed: 1, ran_at: '2026-11-08T12:00:00.000Z' } } })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong X-Job-Token, or JOB_TOKEN not set' })
  @Public()
  @Post('bookings')
  @HttpCode(200)
  runBookingJob(@Headers('x-job-token') token?: string) {
    const expected = this.config.get<string>('JOB_TOKEN');
    const given = Buffer.from(token ?? '');
    const wanted = Buffer.from(expected ?? '');
    if (!expected || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      throw new UnauthorizedException();
    }
    return this.jobs.run();
  }
}
