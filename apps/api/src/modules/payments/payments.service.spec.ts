import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { MetricsService } from '../../metrics/metrics.service';
import { LoggerService } from '../../common/logger/logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {
    payment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRealtimeGateway = {
    emitToRestaurant: jest.fn(),
  };

  const mockMetricsService = {
    recordPayment: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ orderId: 999, method: 'CASH' as any, currency: 'UZS' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid order status', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 1,
        restaurantId: 1,
        status: 'NEW',
        totalAmount: 50000,
        payment: null,
      });

      await expect(
        service.create({ orderId: 1, method: 'CASH' as any, currency: 'UZS' }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when payment not found', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should return payment when found', async () => {
      const mockPayment = {
        id: 1,
        restaurantId: 1,
        amount: 50000,
        method: 'CASH',
        status: 'COMPLETED',
      };
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.findOne(1, 1);
      expect(result).toEqual(mockPayment);
    });
  });
});
