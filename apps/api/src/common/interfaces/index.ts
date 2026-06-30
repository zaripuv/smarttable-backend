import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  restaurantId?: number;
  sessionId?: string;
}

export interface AuthenticatedUser {
  id: number;
  uuid: string;
  email: string;
  role: UserRole;
  restaurantId?: number;
  permissions?: string[];
  sessionId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SocketPayload {
  restaurantId: number;
  event: string;
  data: Record<string, unknown>;
}
