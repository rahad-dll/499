import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { payment_method } from '../../generated/prisma/enums.js';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'b430942a-7f74-478d-8cfe-82a71ac60323' })
  @IsUUID()
  booking_id: string;

  @ApiProperty({ enum: payment_method, example: payment_method.bkash, description: 'cash is paid at the lot' })
  @IsEnum(payment_method)
  method: payment_method;
}

export class DummyPayDto {
  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  @IsIn(['success', 'failed'])
  result: 'success' | 'failed';
}

export class GatewayWebhookDto {
  @ApiProperty({ example: 'DUMMY-7Q3K9X2M1A' })
  @IsString()
  @MaxLength(255)
  trx_id: string;

  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  @IsIn(['success', 'failed'])
  status: 'success' | 'failed';

  @ApiProperty({ example: 10000, description: 'Amount in paisa' })
  @Type(() => Number)
  @IsInt()
  amount_unit: number;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
