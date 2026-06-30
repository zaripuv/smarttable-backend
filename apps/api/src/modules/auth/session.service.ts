import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: number, userAgent?: string, ipAddress?: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.session.create({
      data: {
        userId,
        token,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  async getActiveSessions(userId: number) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActive: 'desc' },
    });
  }

  async revokeSession(sessionId: number) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });
  }

  async revokeAllSessions(userId: number) {
    return this.prisma.session.updateMany({
      where: { userId, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });
  }

  async updateLastActive(sessionToken: string) {
    return this.prisma.session.updateMany({
      where: { token: sessionToken },
      data: { lastActive: new Date() },
    });
  }
}
