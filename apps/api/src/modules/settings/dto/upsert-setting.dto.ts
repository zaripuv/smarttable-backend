import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpsertSettingDto {
  @ApiProperty({ example: 'order_auto_accept' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: { enabled: true, delay: 30 } })
  @IsNotEmpty()
  value: unknown;
}
