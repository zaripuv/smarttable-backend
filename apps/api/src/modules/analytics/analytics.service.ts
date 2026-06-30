import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(restaurantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      todayRevenue,
      totalOrders,
      totalRevenue,
      activeOrders,
      pendingPayments,
      totalProducts,
      totalEmployees,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { restaurantId, createdAt: { gte: today }, deletedAt: null },
      }),
      this.prisma.payment.aggregate({
        where: {
          restaurantId,
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: today },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: { restaurantId, deletedAt: null },
      }),
      this.prisma.payment.aggregate({
        where: { restaurantId, status: PaymentStatus.COMPLETED, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: {
            in: [OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY],
          },
          deletedAt: null,
        },
      }),
      this.prisma.payment.count({
        where: { restaurantId, status: PaymentStatus.PENDING, deletedAt: null },
      }),
      this.prisma.product.count({
        where: { restaurantId, deletedAt: null },
      }),
      this.prisma.employee.count({
        where: { restaurantId, isActive: true, deletedAt: null },
      }),
    ]);

    return {
      today: {
        orders: todayOrders,
        revenue: todayRevenue._sum.amount || 0,
      },
      total: {
        orders: totalOrders,
        revenue: totalRevenue._sum.amount || 0,
      },
      active: {
        orders: activeOrders,
        pendingPayments,
      },
      counts: {
        products: totalProducts,
        employees: totalEmployees,
      },
    };
  }

  async getOrderStats(restaurantId: number, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        restaurantId,
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _count: { status: true },
    });

    return orders.map((o) => ({
      status: o.status,
      count: o._count.status,
    }));
  }

  async getRevenueStats(restaurantId: number, startDate: Date, endDate: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        restaurantId,
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: { amount: true, method: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });

    const byMethod = payments.reduce(
      (acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalRevenue,
      byMethod,
      transactionCount: payments.length,
    };
  }

  async getTopProducts(restaurantId: number, limit: number = 10) {
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { restaurantId, deletedAt: null, status: { not: OrderStatus.REJECTED } },
        deletedAt: null,
      },
      _sum: { quantity: true, totalPrice: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((tp) => ({
      product: productMap.get(tp.productId),
      totalQuantity: tp._sum.quantity,
      totalRevenue: tp._sum.totalPrice,
      orderCount: tp._count.productId,
    }));
  }

  async saveSnapshot(restaurantId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [orderStats, revenueStats, topProducts] = await Promise.all([
      this.prisma.order.count({
        where: { restaurantId, createdAt: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
      }),
      this.prisma.payment.aggregate({
        where: {
          restaurantId,
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
        },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.getTopProducts(restaurantId, 5),
    ]);

    const customers = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        customerId: { not: null },
        deletedAt: null,
      },
      distinct: ['customerId'],
    });

    return this.prisma.analyticsSnapshot.upsert({
      where: { restaurantId_date: { restaurantId, date: startOfDay } },
      create: {
        restaurantId,
        date: startOfDay,
        totalOrders: orderStats,
        totalRevenue: revenueStats._sum.amount || 0,
        avgOrderValue: revenueStats._avg.amount || 0,
        totalCustomers: customers.length,
        topProducts: topProducts as object,
      },
      update: {
        totalOrders: orderStats,
        totalRevenue: revenueStats._sum.amount || 0,
        avgOrderValue: revenueStats._avg.amount || 0,
        totalCustomers: customers.length,
        topProducts: topProducts as object,
      },
    });
  }
}
