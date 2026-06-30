import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Thank you for your kind words!' })
  @IsString()
  @MinLength(1)
  reply: string;
}
