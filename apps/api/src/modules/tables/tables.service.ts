import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTableDto, restaurantId: number) {
    const existing = await this.prisma.restaurantTable.findFirst({
      where: { branchId: dto.branchId, number: dto.number, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Table number ${dto.number} already exists in this branch`);
    }

    return this.prisma.restaurantTable.create({
      data: {
        restaurantId,
        branchId: dto.branchId,
        number: dto.number,
        name: dto.name,
        capacity: dto.capacity || 4,
      },
    });
  }

  async findAll(restaurantId: number, branchId: number, query: PaginationDto) {
    const where: Record<string, unknown> = { restaurantId, branchId, deletedAt: null };

    if (query.search) {
      where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }];
    }

    const [tables, total] = await Promise.all([
      this.prisma.restaurantTable.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { number: 'asc' },
        include: {
          qrCode: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.restaurantTable.count({ where }),
    ]);

    return {
      data: tables,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, restaurantId: number) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        qrCode: true,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async update(id: number, dto: UpdateTableDto, restaurantId: number) {
    await this.findOne(id, restaurantId);

    if (dto.number) {
      const table = await this.prisma.restaurantTable.findFirst({
        where: { id, restaurantId, deletedAt: null },
      });
      const existing = await this.prisma.restaurantTable.findFirst({
        where: {
          branchId: table!.branchId,
          number: dto.number,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictException(`Table number ${dto.number} already exists in this branch`);
      }
    }

    return this.prisma.restaurantTable.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.restaurantTable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async toggleOccupied(id: number, restaurantId: number) {
    const table = await this.findOne(id, restaurantId);

    return this.prisma.restaurantTable.update({
      where: { id },
      data: { isOccupied: !table.isOccupied },
    });
  }
}
