import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination, generateSlug } from '../../common/utils';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto, user: AuthenticatedUser) {
    const slug = generateSlug(dto.name);

    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        country: dto.country || 'Uzbekistan',
        currency: dto.currency || 'UZS',
        timezone: dto.timezone || 'Asia/Tashkent',
        ownerId: user.id,
      },
    });
  }

  async findAll(query: PaginationDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (user.role !== UserRole.SUPER_ADMIN) {
      where.ownerId = user.id;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [restaurants, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          _count: { select: { branches: true, orders: true, employees: true, products: true } },
          subscription: { include: { plan: { select: { name: true } } } },
        },
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return {
      data: restaurants,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findByUuid(uuid: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { uuid, deletedAt: null, isActive: true },
      select: {
        id: true,
        uuid: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        phone: true,
        address: true,
        city: true,
        currency: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
      include: {
        branches: { where: { deletedAt: null } },
        subscription: { include: { plan: true } },
        _count: {
          select: {
            branches: true,
            orders: true,
            employees: true,
            products: true,
            categories: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (user.role !== UserRole.SUPER_ADMIN && restaurant.ownerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return restaurant;
  }

  async update(id: number, dto: UpdateRestaurantDto, user: AuthenticatedUser) {
    await this.findOne(id, user);

    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    await this.findOne(id, user);

    return this.prisma.restaurant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
