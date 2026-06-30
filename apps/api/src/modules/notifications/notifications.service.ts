import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { LoggerService } from '../../common/logger/logger.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        restaurantId: dto.restaurantId,
        title: dto.title,
        body: dto.body,
        type: dto.type || NotificationType.SYSTEM,
        data: dto.data as object,
      },
    });

    this.realtimeGateway.emitNotification(dto.restaurantId, {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
    });

    return notification;
  }

  async findAll(
    restaurantId: number,
    query: PaginationDto & { type?: NotificationType; isRead?: boolean },
  ) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async markAsRead(id: number, restaurantId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(restaurantId: number) {
    return this.prisma.notification.updateMany({
      where: { restaurantId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(restaurantId: number) {
    const count = await this.prisma.notification.count({
      where: { restaurantId, isRead: false, deletedAt: null },
    });
    return { count };
  }

  async remove(id: number, restaurantId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
