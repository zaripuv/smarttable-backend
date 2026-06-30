import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { MetricsService } from '../../metrics/metrics.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRealtimeGateway = {
    emitToRestaurant: jest.fn(),
  };

  const mockMetricsService = {
    recordOrder: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should return order when found', async () => {
      const mockOrder = {
        id: 1,
        restaurantId: 1,
        orderNumber: 'ORD-TEST-001',
        status: 'NEW',
        items: [],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne(1, 1);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus(999, { status: 'ACCEPTED' as any }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 1,
        restaurantId: 1,
        status: 'COMPLETED',
      });

      await expect(service.updateStatus(1, { status: 'NEW' as any }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update status for valid transition', async () => {
      const mockOrder = {
        id: 1,
        restaurantId: 1,
        status: 'NEW',
        orderNumber: 'ORD-TEST-001',
      };
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'ACCEPTED',
      });

      const result = await service.updateStatus(1, { status: 'ACCEPTED' as any }, 1);

      expect(result.status).toBe('ACCEPTED');
      expect(mockRealtimeGateway.emitToRestaurant).toHaveBeenCalled();
      expect(mockMetricsService.recordOrder).toHaveBeenCalled();
    });
  });
});
