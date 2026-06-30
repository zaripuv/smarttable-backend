import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@ApiTags('QR Codes')
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post('table/:tableId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Generate QR code for a table' })
  @ApiResponse({ status: 201, description: 'QR code generated' })
  async generate(
    @Param('tableId', ParseIntPipe) tableId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qrCodesService.generate(tableId, user.restaurantId!);
  }

  @Patch(':id/regenerate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Regenerate QR code' })
  @ApiResponse({ status: 200, description: 'QR code regenerated' })
  async regenerate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.qrCodesService.regenerate(id, user.restaurantId!);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all QR codes for restaurant' })
  @ApiResponse({ status: 200, description: 'List of QR codes' })
  async findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.qrCodesService.findAll(user.restaurantId!, query);
  }

  @Get('scan/:code')
  @Public()
  @ApiOperation({ summary: 'Scan a QR code (public endpoint for customers)' })
  @ApiResponse({ status: 200, description: 'QR code scanned - returns restaurant and table info' })
  async scan(@Param('code') code: string) {
    return this.qrCodesService.scan(code);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete QR code' })
  @ApiResponse({ status: 200, description: 'QR code deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.qrCodesService.remove(id, user.restaurantId!);
  }
}
