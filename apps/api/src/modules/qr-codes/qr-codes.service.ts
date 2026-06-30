import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { generateQRCode } from '../../common/utils';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { calculatePagination } from '../../common/utils';

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generate(tableId: number, restaurantId: number) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const existing = await this.prisma.qRCode.findFirst({
      where: { tableId, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('QR code already exists for this table');
    }

    const code = generateQRCode();
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const imageUrl = `${appUrl}/api/v1/qr-codes/scan/${code}`;

    return this.prisma.qRCode.create({
      data: {
        restaurantId,
        tableId,
        code,
        imageUrl,
      },
      include: {
        table: { select: { id: true, number: true, name: true } },
      },
    });
  }

  async regenerate(id: number, restaurantId: number) {
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    const code = generateQRCode();
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const imageUrl = `${appUrl}/api/v1/qr-codes/scan/${code}`;

    return this.prisma.qRCode.update({
      where: { id },
      data: { code, imageUrl, scannedCount: 0 },
      include: {
        table: { select: { id: true, number: true, name: true } },
      },
    });
  }

  async findAll(restaurantId: number, query: PaginationDto) {
    const where: Record<string, unknown> = { restaurantId, deletedAt: null };

    const [qrCodes, total] = await Promise.all([
      this.prisma.qRCode.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          table: {
            select: {
              id: true,
              number: true,
              name: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.qRCode.count({ where }),
    ]);

    return {
      data: qrCodes,
      meta: calculatePagination(total, query.page || 1, query.limit || 20),
    };
  }

  async scan(code: string) {
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { code, isActive: true, deletedAt: null },
      include: {
        restaurant: {
          select: { id: true, uuid: true, name: true, slug: true, logo: true },
        },
        table: {
          select: { id: true, number: true, name: true, branchId: true },
        },
      },
    });

    if (!qrCode) {
      throw new NotFoundException('Invalid or inactive QR code');
    }

    await this.prisma.qRCode.update({
      where: { id: qrCode.id },
      data: { scannedCount: { increment: 1 }, lastScannedAt: new Date() },
    });

    return {
      restaurant: qrCode.restaurant,
      table: qrCode.table,
    };
  }

  async remove(id: number, restaurantId: number) {
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return this.prisma.qRCode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
