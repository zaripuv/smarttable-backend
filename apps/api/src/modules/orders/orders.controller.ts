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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole, OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new order (customer or guest)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto, dto.branchId);
  }

  @Post('authenticated')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create order as authenticated user' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async createAuthenticated(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.create(dto, user.restaurantId || dto.branchId, user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Get all orders for the restaurant' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  async findAll(
    @Query() query: PaginationDto & { status?: OrderStatus; branchId?: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findAll(user.restaurantId!, query);
  }

  @Get('active')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Get active orders' })
  @ApiResponse({ status: 200, description: 'Active orders' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  async getActiveOrders(
    @Query('branchId') branchId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getActiveOrders(user.restaurantId!, branchId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findOne(id, user.restaurantId!);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.RESTAURANT_OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.restaurantId!);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete order (soft delete)' })
  @ApiResponse({ status: 200, description: 'Order deleted' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.remove(id, user.restaurantId!);
  }
}
