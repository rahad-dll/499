// Booking payments: initiate, gateway callback, history. Uses a dummy gateway for now.

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { GatewayWebhookDto, InitiatePaymentDto, ListPaymentsQueryDto } from './dto/payments.dto';

const DUMMY_GATEWAY = 'dummy';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── initiate ──────────────────────────────────────────────────────────────

  async initiate(dto: InitiatePaymentDto, user: JwtPayload) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id: dto.booking_id, deleted_at: null },
      include: { driver: { select: { user_id: true } }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driver.user_id !== user.sub) throw new ForbiddenException();
    if (['cancelled', 'no_show'].includes(booking.status)) {
      throw new BadRequestException(`Cannot pay for a booking with status: ${booking.status}`);
    }
    if (!booking.amount_unit) throw new BadRequestException('This booking has no price to pay');
    if (booking.payment && ['paid', 'refunded'].includes(booking.payment.status)) {
      throw new ConflictException(`This booking is already ${booking.payment.status}`);
    }

    // cash is paid at the lot
    const trxId = dto.method === 'cash' ? null : `DUMMY-${randomBytes(5).toString('hex').toUpperCase()}`;
    const data = {
      method: dto.method,
      status: 'pending' as const,
      amount_unit: booking.amount_unit,
      gateway_trx_id: trxId,
      gateway_meta: trxId ? { gateway: DUMMY_GATEWAY } : undefined,
    };
    // one payment per booking; a new attempt replaces the old one
    const payment = await this.prisma.payment_transactions.upsert({
      where: { booking_id: booking.id },
      update: data,
      create: { booking_id: booking.id, ...data },
    });
    await this.prisma.bookings.update({ where: { id: booking.id }, data: { payment_status: 'pending' } });

    return {
      ...this.format(payment),
      checkout: trxId
        ? {
            gateway: DUMMY_GATEWAY,
            trx_id: trxId,
            pay_url: `/payments/dummy/${trxId}/pay`,
            note: 'Dummy gateway: POST pay_url with { "result": "success" } or { "result": "failed" }',
          }
        : { gateway: null, note: 'Pay cash at the parking; the payment stays pending until collected' },
    };
  }

  // ── dummy gateway ─────────────────────────────────────────────────────────

  async dummyPay(trxId: string, result: 'success' | 'failed', user: JwtPayload) {
    const payment = await this.prisma.payment_transactions.findFirst({
      where: { gateway_trx_id: trxId, deleted_at: null },
      include: { booking: { include: { driver: { select: { user_id: true } } } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.booking.driver.user_id !== user.sub) throw new ForbiddenException();

    const body: GatewayWebhookDto = { trx_id: trxId, status: result, amount_unit: payment.amount_unit };
    return this.webhook(DUMMY_GATEWAY, body, this.sign(body));
  }

  // ── webhook ───────────────────────────────────────────────────────────────

  async webhook(gateway: string, body: GatewayWebhookDto, signature?: string) {
    if (gateway !== DUMMY_GATEWAY) throw new NotFoundException(`Unknown gateway: ${gateway}`);
    this.verify(body, signature);

    const payment = await this.prisma.payment_transactions.findFirst({
      where: { gateway_trx_id: body.trx_id, deleted_at: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // already settled
    if (payment.status !== 'pending') return { received: true, ...this.format(payment) };
    if (body.status === 'success' && body.amount_unit !== payment.amount_unit) {
      throw new BadRequestException('Amount does not match the payment');
    }

    const status = body.status === 'success' ? 'paid' : 'failed';
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment_transactions.update({
        where: { id: payment.id },
        data: {
          status,
          ...(status === 'paid' && { paid_at: now }),
          gateway_meta: { gateway, callback_status: body.status, received_at: now.toISOString() },
        },
      });
      await tx.bookings.update({ where: { id: payment.booking_id }, data: { payment_status: status } });
      return row;
    });
    return { received: true, ...this.format(updated) };
  }

  // ── list ──────────────────────────────────────────────────────────────────

  async findAll(user: JwtPayload, query: ListPaymentsQueryDto) {
    const { page, limit } = query;
    const where = { deleted_at: null, booking: { driver: { user_id: user.sub } } };
    const [total, rows] = await Promise.all([
      this.prisma.payment_transactions.count({ where }),
      this.prisma.payment_transactions.findMany({
        where,
        include: { booking: { select: { space: { select: { name: true } }, slot: { select: { slot_label: true } }, scheduled_at: true } } },
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((p) => ({
        ...this.format(p),
        space_name: p.booking.space.name,
        slot_label: p.booking.slot.slot_label,
        scheduled_at: p.booking.scheduled_at,
      })),
      page,
      limit,
      total,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private secret() {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) throw new UnauthorizedException('Payments are not configured');
    return secret;
  }

  private sign(body: GatewayWebhookDto) {
    return createHmac('sha256', this.secret())
      .update(`${body.trx_id}|${body.status}|${body.amount_unit}`)
      .digest('hex');
  }

  private verify(body: GatewayWebhookDto, signature?: string) {
    const expected = Buffer.from(this.sign(body));
    const given = Buffer.from(signature ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private format(p: {
    id: string; booking_id: string; method: string; status: string; amount_unit: number;
    gateway_trx_id: string | null; paid_at: Date | null; refunded_at: Date | null;
    refund_amount_unit: number | null; created_at: Date;
  }) {
    return {
      payment_id: p.id,
      booking_id: p.booking_id,
      method: p.method,
      status: p.status,
      amount_unit: p.amount_unit,
      amount: p.amount_unit / 100,
      trx_id: p.gateway_trx_id,
      paid_at: p.paid_at,
      refunded_at: p.refunded_at,
      refund_amount_unit: p.refund_amount_unit,
      created_at: p.created_at,
    };
  }
}
