import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTableDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  number: number;

  @ApiPropertyOptional({ example: 'Window Table' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  capacity?: number;
}
