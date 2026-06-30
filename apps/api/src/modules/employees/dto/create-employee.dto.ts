import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 'Head Chef' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}
