import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RefundPaymentDto {
  @ApiPropertyOptional({
    example: 25000,
    description: 'Amount to refund (defaults to full amount)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: 'Customer complaint' })
  @IsOptional()
  @IsString()
  reason?: string;
}
