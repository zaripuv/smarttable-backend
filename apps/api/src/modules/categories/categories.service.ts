import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, restaurantId: number) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, restaurantId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        image: dto.image,
        sortOrder: dto.sortOrder || 0,
        parentId: dto.parentId,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async findAll(restaurantId: number, query: PaginationDto) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { sortOrder: 'asc' },
        include: {
          parent: { select: { id: true, name: true } },
          children: { where: { deletedAt: null }, select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findTree(restaurantId: number) {
    return this.prisma.category.findMany({
      where: { restaurantId, parentId: null, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true } },
        children: { where: { deletedAt: null } },
        products: { where: { deletedAt: null }, take: 10 },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, restaurantId: number) {
    await this.findOne(id, restaurantId);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, restaurantId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
