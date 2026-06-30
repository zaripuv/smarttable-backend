import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { MetricsService } from '../../metrics/metrics.service';
import { LoggerService } from '../../common/logger/logger.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination, generateOrderNumber } from '../../common/utils';
import { ORDER_STATUS_TRANSITIONS, SOCKET_EVENTS } from '../../common/constants';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateOrderDto, restaurantId: number, customerId?: number) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { items: { include: { product: true } } },
      });
      if (existing) {
        return existing;
      }
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((item) => item.productId) },
        restaurantId,
        deletedAt: null,
        isActive: true,
        isAvailable: true,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.discountPrice
        ? Number(product.discountPrice)
        : Number(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        notes: item.notes,
      };
    });

    const tax = subtotal * 0.12;
    const total = subtotal + tax - (dto.discount || 0);

    const order = await this.prisma.order.create({
      data: {
        restaurantId,
        branchId: dto.branchId,
        tableId: dto.tableId,
        customerId,
        orderNumber: generateOrderNumber(),
        subtotal,
        tax,
        discount: dto.discount || 0,
        total,
        notes: dto.notes,
        idempotencyKey: dto.idempotencyKey,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, price: true } } } },
        table: { select: { id: true, number: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    this.realtimeGateway.emitNewOrder(restaurantId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      total: order.total,
      itemCount: order.items.length,
    });

    this.metricsService.recordOrder(restaurantId, 'NEW');
    this.logger.log(`Order created: ${order.orderNumber}`, 'OrdersService');

    return order;
  }

  async findAll(
    restaurantId: number,
    query: PaginationDto & { status?: OrderStatus; branchId?: number },
  ) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.search) {
      where.orderNumber = { contains: query.search, mode: 'insensitive' };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          table: { select: { id: true, number: true, name: true } },
          branch: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          payment: { select: { id: true, method: true, status: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, restaurantId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        items: {
          include: { product: { include: { images: { where: { deletedAt: null }, take: 1 } } } },
        },
        table: true,
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        employee: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, restaurantId: number) {
    const order = await this.findOne(id, restaurantId);

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: dto.status,
      version: { increment: 1 },
    };

    switch (dto.status) {
      case OrderStatus.ACCEPTED:
        updateData.acceptedAt = new Date();
        if (dto.estimatedMinutes) {
          const ready = new Date();
          ready.setMinutes(ready.getMinutes() + dto.estimatedMinutes);
          updateData.estimatedReadyAt = ready;
        }
        break;
      case OrderStatus.PREPARING:
        updateData.preparedAt = new Date();
        break;
      case OrderStatus.READY:
        updateData.readyAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        break;
      case OrderStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
      case OrderStatus.REJECTED:
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = dto.reason;
        break;
    }

    if (dto.employeeId) {
      updateData.employeeId = dto.employeeId;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        table: { select: { id: true, number: true, name: true } },
      },
    });

    const eventMap: Record<string, string> = {
      ACCEPTED: SOCKET_EVENTS.ORDER_ACCEPTED,
      PREPARING: SOCKET_EVENTS.ORDER_PREPARING,
      READY: SOCKET_EVENTS.ORDER_READY,
      DELIVERING: SOCKET_EVENTS.ORDER_DELIVERING,
      DELIVERED: SOCKET_EVENTS.ORDER_DELIVERED,
    };

    const event = eventMap[dto.status];
    if (event) {
      this.realtimeGateway.emitOrderStatusChange(restaurantId, event, {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        tableNumber: updatedOrder.table?.number,
      });
    }

    this.metricsService.recordOrder(restaurantId, dto.status);
    this.logger.log(
      `Order ${order.orderNumber} status changed: ${order.status} -> ${dto.status}`,
      'OrdersService',
    );

    return updatedOrder;
  }

  async getActiveOrders(restaurantId: number, branchId?: number) {
    const where: Record<string, unknown> = {
      restaurantId,
      deletedAt: null,
      status: {
        in: [
          OrderStatus.NEW,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.DELIVERING,
        ],
      },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        table: { select: { id: true, number: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
