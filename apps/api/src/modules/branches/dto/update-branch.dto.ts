import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto extends PartialType(OmitType(CreateBranchDto, ['restaurantId'])) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
