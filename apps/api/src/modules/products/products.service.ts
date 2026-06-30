import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, restaurantId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, restaurantId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.product.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice,
        sku: dto.sku,
        preparationTime: dto.preparationTime,
        calories: dto.calories,
        allergens: dto.allergens as object,
        tags: dto.tags as object,
        sortOrder: dto.sortOrder || 0,
      },
      include: {
        category: { select: { id: true, name: true } },
        images: true,
      },
    });
  }

  async findAll(restaurantId: number, query: PaginationDto & { categoryId?: number }) {
    const where: Record<string, unknown> = {
      restaurantId,
      deletedAt: null,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy || 'sortOrder']: query.sortOrder || 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, restaurantId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findByCategory(restaurantId: number, categoryId: number) {
    return this.prisma.product.findMany({
      where: { restaurantId, categoryId, deletedAt: null, isActive: true, isAvailable: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: number, dto: UpdateProductDto, restaurantId: number) {
    const product = await this.findOne(id, restaurantId);

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        ...dto,
        allergens: dto.allergens as object,
        tags: dto.tags as object,
        version: { increment: 1 },
      },
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async toggleAvailability(id: number, restaurantId: number) {
    const product = await this.findOne(id, restaurantId);

    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }
}
