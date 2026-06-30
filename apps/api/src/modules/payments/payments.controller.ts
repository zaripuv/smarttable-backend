import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole, PaymentStatus } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.create(dto, user.restaurantId!);
  }

  @Patch(':id/complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Complete a payment' })
  @ApiResponse({ status: 200, description: 'Payment completed' })
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Body('transactionId') transactionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.complete(id, user.restaurantId!, transactionId);
  }

  @Post(':id/refund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded' })
  async refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.refund(id, dto, user.restaurantId!);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  async findAll(
    @Query() query: PaginationDto & { status?: PaymentStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.findAll(user.restaurantId!, query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.findOne(id, user.restaurantId!);
  }
}
