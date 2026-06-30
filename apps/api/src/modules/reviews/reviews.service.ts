import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateReviewDto, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: dto.restaurantId, deletedAt: null },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const review = await this.prisma.review.create({
      data: {
        restaurantId: dto.restaurantId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    this.realtimeGateway.emitReviewAdded(dto.restaurantId, {
      reviewId: review.id,
      rating: review.rating,
      userName: `${review.user.firstName} ${review.user.lastName || ''}`.trim(),
    });

    return review;
  }

  async findAll(restaurantId: number, query: PaginationDto & { rating?: number }) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.rating) {
      where.rating = query.rating;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async getStats(restaurantId: number) {
    const stats = await this.prisma.review.aggregate({
      where: { restaurantId, deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { restaurantId, deletedAt: null },
      _count: { rating: true },
    });

    return {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating,
      distribution: distribution.map((d) => ({
        rating: d.rating,
        count: d._count.rating,
      })),
    };
  }

  async reply(id: number, dto: ReplyReviewDto, user: AuthenticatedUser) {
    const review = await this.prisma.review.findFirst({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && user.restaurantId !== review.restaurantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.review.update({
      where: { id },
      data: { reply: dto.reply, repliedAt: new Date() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    const review = await this.prisma.review.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
