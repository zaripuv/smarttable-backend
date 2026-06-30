import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @ApiProperty({ example: 'Grilled Chicken' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Juicy grilled chicken with herbs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 39000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({ example: 'GC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  preparationTime?: number;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  calories?: number;

  @ApiPropertyOptional({ example: ['gluten', 'dairy'] })
  @IsOptional()
  @IsArray()
  allergens?: string[];

  @ApiPropertyOptional({ example: ['spicy', 'popular'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
