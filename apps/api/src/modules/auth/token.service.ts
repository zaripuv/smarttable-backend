import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateTokens(payload: Omit<JwtPayload, 'sessionId'>) {
    const sessionId = uuidv4();

    const accessToken = this.jwtService.sign(
      { ...payload, sessionId },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, sessionId, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      },
    );

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: number, token: string, userAgent?: string, ipAddress?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  async generatePasswordResetToken(userId: number): Promise<string> {
    return this.jwtService.sign(
      { sub: userId, type: 'password_reset' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h',
      },
    );
  }

  async verifyPasswordResetToken(token: string): Promise<{ sub: number } | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== 'password_reset') {
        return null;
      }
      return { sub: payload.sub };
    } catch {
      return null;
    }
  }

  async generateEmailVerificationToken(userId: number): Promise<string> {
    return this.jwtService.sign(
      { sub: userId, type: 'email_verification' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '24h',
      },
    );
  }

  async verifyEmailToken(token: string): Promise<{ sub: number } | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== 'email_verification') {
        return null;
      }
      return { sub: payload.sub };
    } catch {
      return null;
    }
  }
}
