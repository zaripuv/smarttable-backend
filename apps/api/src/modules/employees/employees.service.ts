import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto, restaurantId: number) {
    const existing = await this.prisma.employee.findFirst({
      where: { restaurantId, userId: dto.userId, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Employee already exists in this restaurant');
    }

    return this.prisma.employee.create({
      data: {
        restaurantId,
        branchId: dto.branchId,
        userId: dto.userId,
        roleId: dto.roleId,
        position: dto.position,
      },
      include: {
        user: {
          select: {
            id: true,
            uuid: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        branch: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(restaurantId: number, query: PaginationDto & { branchId?: number }) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.search) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              phone: true,
            },
          },
          branch: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async findOne(id: number, restaurantId: number) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            uuid: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
          },
        },
        branch: { select: { id: true, name: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.employee.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        roleId: dto.roleId,
        position: dto.position,
        isActive: dto.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            uuid: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        branch: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);

    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), firedAt: new Date() },
    });
  }
}
