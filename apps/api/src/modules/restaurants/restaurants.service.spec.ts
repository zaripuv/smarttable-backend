import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  const mockPrismaService = {
    restaurant: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RestaurantsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a restaurant', async () => {
      const dto = {
        name: 'Test Restaurant',
        phone: '+998901234567',
      };
      const user = {
        id: 1,
        uuid: 'test-uuid',
        email: 'owner@test.com',
        role: UserRole.RESTAURANT_OWNER,
      };

      mockPrismaService.restaurant.create.mockResolvedValue({
        id: 1,
        ...dto,
        ownerId: user.id,
        slug: 'test-restaurant-abc1',
      });

      const result = await service.create(dto as any, user);
      expect(result).toHaveProperty('id');
      expect(mockPrismaService.restaurant.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when restaurant not found', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue(null);

      const user = {
        id: 1,
        uuid: 'test-uuid',
        email: 'owner@test.com',
        role: UserRole.RESTAURANT_OWNER,
      };

      await expect(service.findOne(999, user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing another owners restaurant', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue({
        id: 1,
        ownerId: 2,
      });

      const user = {
        id: 1,
        uuid: 'test-uuid',
        email: 'owner@test.com',
        role: UserRole.RESTAURANT_OWNER,
      };

      await expect(service.findOne(1, user)).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to access any restaurant', async () => {
      const mockRestaurant = { id: 1, ownerId: 2, name: 'Other Restaurant' };
      mockPrismaService.restaurant.findFirst.mockResolvedValue(mockRestaurant);

      const user = {
        id: 99,
        uuid: 'admin-uuid',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
      };

      const result = await service.findOne(1, user);
      expect(result).toEqual(mockRestaurant);
    });
  });

  describe('findByUuid', () => {
    it('should throw NotFoundException for non-existent uuid', async () => {
      mockPrismaService.restaurant.findFirst.mockResolvedValue(null);

      await expect(service.findByUuid('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should return restaurant by uuid', async () => {
      const mockRestaurant = { id: 1, uuid: 'test-uuid', name: 'Test' };
      mockPrismaService.restaurant.findFirst.mockResolvedValue(mockRestaurant);

      const result = await service.findByUuid('test-uuid');
      expect(result).toEqual(mockRestaurant);
    });
  });
});
