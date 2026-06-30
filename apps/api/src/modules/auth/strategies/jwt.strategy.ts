import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../../../common/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employees: {
          where: { isActive: true, deletedAt: null },
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const employee = user.employees[0];
    const permissions = employee?.role?.permissions.map((rp) => rp.permission.name) || [];

    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      role: user.role,
      restaurantId: employee?.restaurantId || payload.restaurantId,
      permissions,
      sessionId: payload.sessionId,
    };
  }
}
