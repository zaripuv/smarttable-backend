import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsInt, Min, IsObject, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Full access with unlimited features' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 199000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 'UZS', default: 'UZS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'monthly', default: 'monthly' })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  interval?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxTables?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxProducts?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxEmployees?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}
