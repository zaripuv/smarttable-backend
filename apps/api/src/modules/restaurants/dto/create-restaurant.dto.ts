import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MaxLength, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Oasis Restaurant' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Fine dining experience' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@oasis.uz' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://oasis.uz' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: '123 Main St, Tashkent' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Uzbekistan' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'UZS', default: 'UZS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Tashkent', default: 'Asia/Tashkent' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
