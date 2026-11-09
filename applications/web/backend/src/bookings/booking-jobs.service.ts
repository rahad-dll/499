/**
 * BookingJobsService
 *
 * Moves bookings whose time has passed to their final status, so they stop holding slots:
 *   - unpaid holds (status pending) older than 15 minutes -> cancelled
 *   - confirmed, never checked in, booked time over       -> no_show
 *   - checked in, never checked out, 60 min after the end -> completed (no overstay charge)
 *
 * Runs on an interval inside the server and can also be triggered by
 * POST /internal/jobs/bookings (for an outside cron, since a sleeping free
 * server runs no timers). Every step is a single conditional update, so
 * running it twice or at the same time does no harm.
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const MINUTE_MS = 60 * 1000;
const HOLD_MINUTES = 15; // an unpaid hold keeps its slot this long
const AUTO_COMPLETE_MINUTES = 60; // a forgotten check-out is closed this long after the end
const DEFAULT_INTERVAL_MS = 5 * MINUTE_MS;

@Injectable()
export class BookingJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingJobsService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const interval = Number(this.config.get<string>('BOOKING_JOB_INTERVAL_MS', String(DEFAULT_INTERVAL_MS)));
    this.timer = setInterval(() => void this.run().catch((e) => this.logger.error('Booking job failed', e)), interval);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // spaceId limits the run to one lot (used by tests); the timer and the route run over all lots
  async run(spaceId?: string) {
    if (this.running) return { skipped: true };
    this.running = true;
    try {
      const now = new Date();
      const scope = { deleted_at: null, ...(spaceId && { space_id: spaceId }) };

      const expiredHolds = await this.prisma.bookings.updateMany({
        where: {
          ...scope,
          status: 'pending',
          payment_status: 'pending',
          created_at: { lt: new Date(now.getTime() - HOLD_MINUTES * MINUTE_MS) },
        },
        data: { status: 'cancelled', cancellation_reason: 'Unpaid hold expired' },
      });

      const noShows = await this.prisma.bookings.updateMany({
        where: {
          ...scope,
          status: 'confirmed',
          arrived_at: null,
          OR: [{ end_at: { lt: now } }, { end_at: null, hold_expires_at: { lt: now } }],
        },
        data: { status: 'no_show' },
      });

      const closeBefore = new Date(now.getTime() - AUTO_COMPLETE_MINUTES * MINUTE_MS);
      const completed = await this.prisma.bookings.updateMany({
        where: {
          ...scope,
          status: 'confirmed',
          arrived_at: { not: null },
          departed_at: null,
          OR: [{ end_at: { lt: closeBefore } }, { end_at: null, hold_expires_at: { lt: closeBefore } }],
        },
        data: { status: 'completed' },
      });

      const result = {
        expired_holds: expiredHolds.count,
        no_shows: noShows.count,
        auto_completed: completed.count,
        ran_at: now,
      };
      if (expiredHolds.count || noShows.count || completed.count) {
        this.logger.log(`Booking job: ${JSON.stringify(result)}`);
      }
      return result;
    } finally {
      this.running = false;
    }
  }
}
