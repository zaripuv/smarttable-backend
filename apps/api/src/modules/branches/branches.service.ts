import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto, user: AuthenticatedUser) {
    await this.validateRestaurantAccess(dto.restaurantId, user);

    return this.prisma.branch.create({
      data: {
        restaurantId: dto.restaurantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        latitude: dto.latitude,
        longitude: dto.longitude,
        workingHours: dto.workingHours as object,
      },
    });
  }

  async findAll(restaurantId: number, query: PaginationDto, user: AuthenticatedUser) {
    await this.validateRestaurantAccess(restaurantId, user);

    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          _count: { select: { tables: true, orders: true, employees: true } },
        },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      data: branches,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: {
        restaurant: { select: { id: true, name: true, ownerId: true } },
        tables: { where: { deletedAt: null } },
        _count: { select: { tables: true, orders: true, employees: true } },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    await this.validateRestaurantAccess(branch.restaurantId, user);
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto, user: AuthenticatedUser) {
    const branch = await this.findOne(id, user);

    return this.prisma.branch.update({
      where: { id: branch.id },
      data: {
        ...dto,
        workingHours: dto.workingHours as object,
      },
    });
  }

  async remove(id: number, user: AuthenticatedUser) {
    await this.findOne(id, user);

    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async validateRestaurantAccess(restaurantId: number, user: AuthenticatedUser) {
    if (user.role === UserRole.SUPER_ADMIN) return;

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.ownerId !== user.id && user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
