import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    return this.prisma.settings.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(restaurantId: number, key: string) {
    const setting = await this.prisma.settings.findFirst({
      where: { restaurantId, key, deletedAt: null },
    });

    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }

    return setting;
  }

  async upsert(restaurantId: number, dto: UpsertSettingDto) {
    const existing = await this.prisma.settings.findFirst({
      where: { restaurantId, key: dto.key, deletedAt: null },
    });

    if (existing) {
      return this.prisma.settings.update({
        where: { id: existing.id },
        data: { value: dto.value as object },
      });
    }

    return this.prisma.settings.create({
      data: {
        restaurantId,
        key: dto.key,
        value: dto.value as object,
      },
    });
  }

  async upsertBulk(restaurantId: number, settings: UpsertSettingDto[]) {
    const results = await Promise.all(settings.map((dto) => this.upsert(restaurantId, dto)));
    return results;
  }

  async remove(restaurantId: number, key: string) {
    const setting = await this.findByKey(restaurantId, key);

    return this.prisma.settings.update({
      where: { id: setting.id },
      data: { deletedAt: new Date() },
    });
  }
}
