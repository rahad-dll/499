import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DummyPayDto, GatewayWebhookDto, InitiatePaymentDto, ListPaymentsQueryDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 10 Nov · Start paying for a booking (dummy gateway)',
    description:
      'Creates a pending payment for your booking. bkash / nagad / card return a checkout with pay_url; ' +
      'cash returns no checkout and stays pending.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        payment_id: '0c5e8b31-…', booking_id: 'b430942a-…', method: 'bkash', status: 'pending', amount_unit: 10000, amount: 100,
        trx_id: 'DUMMY-7Q3K9X2M1A', checkout: { gateway: 'dummy', trx_id: 'DUMMY-7Q3K9X2M1A', pay_url: '/payments/dummy/DUMMY-7Q3K9X2M1A/pay' },
      },
    },
  })
  @ApiConflictResponse({ description: 'Booking already paid or refunded' })
  @Post('initiate')
  @HttpCode(200)
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.payments.initiate(dto, user);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 10 Nov · Dummy gateway: pay or decline',
    description: 'Test payment page. { "result": "success" } pays, { "result": "failed" } declines.',
  })
  @Post('dummy/:trxId/pay')
  @HttpCode(200)
  dummyPay(@Param('trxId') trxId: string, @Body() dto: DummyPayDto, @CurrentUser() user: JwtPayload) {
    return this.payments.dummyPay(trxId, dto.result, user);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 10 Nov · Gateway callback (server to server)',
    description: 'Called by the payment gateway, not by apps.',
  })
  @ApiUnauthorizedResponse({ description: 'Not allowed' })
  @Public()
  @Post('webhook/:gateway')
  @HttpCode(200)
  webhook(@Param('gateway') gateway: string, @Body() body: GatewayWebhookDto, @Headers('x-signature') signature?: string) {
    return this.payments.webhook(gateway, body, signature);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({ summary: '🆕 NEW 10 Nov · My payments', description: 'Newest first; { data, page, limit, total }.' })
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListPaymentsQueryDto) {
    return this.payments.findAll(user, query);
  }
}
