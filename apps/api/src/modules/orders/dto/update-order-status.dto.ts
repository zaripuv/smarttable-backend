import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Out of ingredients' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 20, description: 'Estimated minutes for preparation' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: 1, description: 'Employee handling the order' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  employeeId?: number;
}
