import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscribeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  restaurantId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  planId: number;
}
