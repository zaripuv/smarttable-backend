import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'UZS',
        interval: dto.interval || 'monthly',
        maxBranches: dto.maxBranches || 1,
        maxTables: dto.maxTables || 10,
        maxProducts: dto.maxProducts || 50,
        maxEmployees: dto.maxEmployees || 5,
        features: dto.features as object,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async findAllPlans(query: PaginationDto) {
    const where: Record<string, unknown> = { deletedAt: null, isActive: true };

    const [plans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return {
      data: plans,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async subscribe(dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, isActive: true, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { restaurantId: dto.restaurantId },
    });

    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new ConflictException('Restaurant already has an active subscription');
    }

    const startDate = new Date();
    const endDate = new Date();
    if (plan.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.interval === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    if (existing) {
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: dto.planId,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
        include: { plan: true },
      });
    }

    return this.prisma.subscription.create({
      data: {
        restaurantId: dto.restaurantId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
      include: { plan: true },
    });
  }

  async getSubscription(restaurantId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return subscription;
  }

  async cancel(restaurantId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
      include: { plan: true },
    });
  }
}
