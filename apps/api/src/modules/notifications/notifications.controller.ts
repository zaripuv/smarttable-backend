import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole, NotificationType } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  async findAll(
    @Query() query: PaginationDto & { type?: NotificationType; isRead?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.findAll(user.restaurantId!, query);
  }

  @Get('unread-count')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.restaurantId!);
  }

  @Patch(':id/read')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAsRead(id, user.restaurantId!);
  }

  @Patch('read-all')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.restaurantId!);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.remove(id, user.restaurantId!);
  }
}
