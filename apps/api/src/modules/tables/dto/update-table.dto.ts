import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTableDto } from './create-table.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto extends PartialType(OmitType(CreateTableDto, ['branchId'])) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
