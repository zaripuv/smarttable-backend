import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { LoggerService } from '../../common/logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || UserRole.CUSTOMER,
      },
    });

    const tokens = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      dto.userAgent,
      dto.ipAddress,
    );

    this.logger.log(`User registered: ${user.email}`, 'AuthService');

    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        employees: {
          where: { isActive: true, deletedAt: null },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
          take: 1,
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const employee = user.employees[0];
    const restaurantId = employee?.restaurantId;
    const permissions = employee?.role?.permissions.map((rp) => rp.permission.name) || [];

    const tokens = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId,
    });

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      dto.userAgent,
      dto.ipAddress,
    );

    const session = await this.sessionService.createSession(user.id, dto.userAgent, dto.ipAddress);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        restaurantId,
        permissions,
      },
      ...tokens,
      sessionId: session.uuid,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { userId: storedToken.userId, isActive: true, deletedAt: null },
    });

    const tokens = await this.tokenService.generateTokens({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      restaurantId: employee?.restaurantId,
    });

    await this.tokenService.saveRefreshToken(
      storedToken.userId,
      tokens.refreshToken,
      dto.userAgent,
      dto.ipAddress,
    );

    return tokens;
  }

  async logout(userId: number, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    await this.sessionService.revokeAllSessions(userId);
    this.logger.log(`User logged out: ${userId}`, 'AuthService');
  }

  async logoutAll(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.sessionService.revokeAllSessions(userId);
    this.logger.log(`All sessions revoked for user: ${userId}`, 'AuthService');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = await this.tokenService.generatePasswordResetToken(user.id);
    this.logger.log(`Password reset requested for: ${user.email}`, 'AuthService');

    return {
      message: 'If the email exists, a reset link has been sent',
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const payload = await this.tokenService.verifyPasswordResetToken(dto.token);
    if (!payload) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Password reset completed for user: ${payload.sub}`, 'AuthService');
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for user: ${userId}`, 'AuthService');
    return { message: 'Password changed successfully' };
  }

  async verifyEmail(token: string) {
    const payload = await this.tokenService.verifyEmailToken(token);
    if (!payload) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { isEmailVerified: true, emailVerifiedAt: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        uuid: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
