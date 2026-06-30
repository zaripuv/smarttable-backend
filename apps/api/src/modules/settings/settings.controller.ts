import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'All settings' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.findAll(user.restaurantId!);
  }

  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get setting by key' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  async findByKey(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.findByKey(user.restaurantId!, key);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create or update a setting' })
  @ApiResponse({ status: 200, description: 'Setting saved' })
  async upsert(@Body() dto: UpsertSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.upsert(user.restaurantId!, dto);
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create or update multiple settings' })
  @ApiResponse({ status: 200, description: 'Settings saved' })
  async upsertBulk(@Body() settings: UpsertSettingDto[], @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.upsertBulk(user.restaurantId!, settings);
  }

  @Delete(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete a setting' })
  @ApiResponse({ status: 200, description: 'Setting deleted' })
  async remove(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.remove(user.restaurantId!, key);
  }
}
