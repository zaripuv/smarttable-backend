import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { MetricsService } from '../../metrics/metrics.service';
import { LoggerService } from '../../common/logger/logger.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';
import { PaymentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreatePaymentDto, restaurantId: number) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, restaurantId, deletedAt: null },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payment) {
      throw new ConflictException('Payment already exists for this order');
    }

    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order must be delivered before payment');
    }

    const payment = await this.prisma.payment.create({
      data: {
        restaurantId,
        orderId: dto.orderId,
        method: dto.method,
        amount: Number(order.total),
        currency: dto.currency || 'UZS',
        transactionId: dto.transactionId,
        idempotencyKey: dto.idempotencyKey,
        metadata: dto.metadata as object,
      },
    });

    this.realtimeGateway.emitPaymentRequested(restaurantId, {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      method: payment.method,
    });

    this.logger.log(
      `Payment created for order ${order.orderNumber}: ${payment.method}`,
      'PaymentsService',
    );

    return payment;
  }

  async complete(id: number, restaurantId: number, transactionId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        transactionId: transactionId || payment.transactionId,
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    this.realtimeGateway.emitPaymentCompleted(restaurantId, {
      paymentId: updatedPayment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      amount: updatedPayment.amount,
      method: updatedPayment.method,
    });

    this.metricsService.recordPayment(restaurantId, payment.method, 'COMPLETED');
    this.logger.log(`Payment completed: ${id}`, 'PaymentsService');

    return updatedPayment;
  }

  async refund(id: number, dto: RefundPaymentDto, restaurantId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundAmount = dto.amount || Number(payment.amount);
    if (refundAmount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const status =
      refundAmount === Number(payment.amount)
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        refundedAt: new Date(),
        refundAmount,
        refundReason: dto.reason,
      },
    });

    this.metricsService.recordPayment(restaurantId, payment.method, status);
    this.logger.log(`Payment refunded: ${id}, amount: ${refundAmount}`, 'PaymentsService');

    return updatedPayment;
  }

  async findAll(restaurantId: number, query: PaginationDto & { status?: PaymentStatus }) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { transactionId: { contains: query.search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, total: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, restaurantId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        order: {
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            table: { select: { id: true, number: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
