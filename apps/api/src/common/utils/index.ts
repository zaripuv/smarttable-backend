import { v4 as uuidv4 } from 'uuid';

export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function generateQRCode(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}

export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}

export function generateResetToken(): string {
  return uuidv4().replace(/-/g, '');
}
