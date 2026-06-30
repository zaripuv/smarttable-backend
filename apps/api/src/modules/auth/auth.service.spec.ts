import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { LoggerService } from '../../common/logger/logger.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const mockTokenService = {
    generateTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    saveRefreshToken: jest.fn().mockResolvedValue(undefined),
    generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token'),
    verifyPasswordResetToken: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue({ id: 1, sessionId: 'session-1' }),
    invalidateSession: jest.fn().mockResolvedValue(undefined),
    invalidateAllSessions: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@smarttable.uz',
      password: 'Test@123',
    };

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: loginDto.email,
        password: hashedPassword,
        isActive: true,
        deletedAt: null,
        employees: [],
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: 1,
        uuid: 'test-uuid',
        email: loginDto.email,
        password: hashedPassword,
        role: 'CUSTOMER',
        isActive: true,
        firstName: 'Test',
        lastName: 'User',
        deletedAt: null,
        employees: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@smarttable.uz',
      password: 'New@12345',
      firstName: 'New',
      lastName: 'User',
      phone: '+998901234567',
    };

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 1,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow();
    });

    it('should create a new user and return tokens', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        uuid: 'new-uuid',
        email: registerDto.email,
        role: 'CUSTOMER',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });
});
