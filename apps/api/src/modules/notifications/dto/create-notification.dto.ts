import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  restaurantId: number;

  @ApiProperty({ example: 'New Order Received' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Order #ORD-123 has been placed at Table 5' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.SYSTEM })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
