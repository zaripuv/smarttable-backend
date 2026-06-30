import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getDashboard(user.restaurantId!);
  }

  @Get('orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiResponse({ status: 200, description: 'Order statistics' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getOrderStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.getOrderStats(
      user.restaurantId!,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('revenue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiResponse({ status: 200, description: 'Revenue statistics' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getRevenueStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.getRevenueStats(
      user.restaurantId!,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('top-products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopProducts(@Query('limit') limit: number, @CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getTopProducts(user.restaurantId!, limit || 10);
  }
}
