import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.DELIVERING, OrderStatus.DELIVERED],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.PAID],
  [OrderStatus.PAID]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED]: [],
};

export const SOCKET_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_PREPARING: 'order_preparing',
  ORDER_READY: 'order_ready',
  ORDER_DELIVERING: 'order_delivering',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_REQUESTED: 'payment_requested',
  PAYMENT_COMPLETED: 'payment_completed',
  REVIEW_ADDED: 'review_added',
  NOTIFICATION: 'notification',
};

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  ORDER: 'order',
  ANALYTICS: 'analytics',
  EMAIL: 'email',
};
