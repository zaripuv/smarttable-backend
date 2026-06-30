import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    restaurantId?: number;
    userId?: number;
    action: string;
    entity: string;
    entityId?: number;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        restaurantId: data.restaurantId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldData: data.oldData as object,
        newData: data.newData as object,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findAll(
    restaurantId: number,
    query: PaginationDto & { entity?: string; action?: string; userId?: number },
  ) {
    const where: Record<string, unknown> = { restaurantId };

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search) {
      where.OR = [
        { entity: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async logActivity(data: {
    restaurantId?: number;
    userId?: number;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.activityLog.create({
      data: {
        restaurantId: data.restaurantId,
        userId: data.userId,
        type: data.type,
        description: data.description,
        metadata: data.metadata as object,
      },
    });
  }

  async getActivityLogs(restaurantId: number, query: PaginationDto & { type?: string }) {
    const where: Record<string, unknown> = { restaurantId };

    if (query.type) {
      where.type = query.type;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }
}
