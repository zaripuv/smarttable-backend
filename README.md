# SmartTable Backend

Multi-tenant SaaS Restaurant QR Ordering Platform backend built with NestJS, TypeScript, Prisma, PostgreSQL, Redis, and Socket.IO.

## Tech Stack

- **Runtime**: Node.js 20, TypeScript 5.7
- **Framework**: NestJS 10
- **ORM**: Prisma 5.22
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7, BullMQ
- **Real-time**: Socket.IO 4.8
- **Auth**: JWT + Refresh Tokens, RBAC
- **Storage**: MinIO (S3-compatible)
- **Monitoring**: Prometheus metrics, Winston logging
- **Package Manager**: PNPM 9 + Turborepo
- **Containerization**: Docker + Docker Compose

## Architecture

```
apps/api/
├── prisma/           # Schema, migrations, seed
├── src/
│   ├── common/       # Guards, filters, interceptors, decorators, DTOs
│   ├── config/       # App configuration & env validation
│   ├── database/     # Prisma service & module
│   ├── metrics/      # Prometheus metrics collection
│   ├── queue/        # BullMQ job queues
│   ├── realtime/     # Socket.IO gateway
│   └── modules/
│       ├── auth/           # JWT auth, sessions, password reset
│       ├── users/          # User management
│       ├── restaurants/    # Multi-tenant restaurants
│       ├── branches/       # Restaurant branches
│       ├── tables/         # Restaurant tables
│       ├── qr-codes/       # QR code generation & scanning
│       ├── categories/     # Product categories (hierarchical)
│       ├── products/       # Menu products
│       ├── orders/         # Order workflow & state machine
│       ├── payments/       # Payment processing & refunds
│       ├── reviews/        # Customer reviews & ratings
│       ├── notifications/  # Push notifications
│       ├── employees/      # Staff management
│       ├── subscriptions/  # Plans & subscriptions
│       ├── analytics/      # Dashboard & analytics
│       ├── settings/       # Restaurant settings (key-value)
│       ├── audit-logs/     # Audit & activity logging
│       ├── upload/         # File upload (MinIO)
│       └── health/         # Health, readiness, liveness checks
├── test/             # E2E tests
└── Dockerfile
```

## Multi-Tenant Design

Every resource is isolated by `restaurant_id`. Queries automatically filter by tenant context. No cross-tenant data access is possible.

## Roles & Permissions

| Role | Access Level |
|------|-------------|
| SUPER_ADMIN | Platform-wide access |
| RESTAURANT_OWNER | Full restaurant management |
| MANAGER | Branch & staff management |
| CHEF | Kitchen order management |
| WAITER | Table service & orders |
| CASHIER | Payment processing |
| CUSTOMER | Ordering & reviews |

## Order Flow

```
NEW → ACCEPTED → PREPARING → READY → DELIVERING → DELIVERED → PAID → COMPLETED
 └→ REJECTED
```

Invalid status transitions throw `BadRequestException`. All transitions emit real-time Socket.IO events.

## Getting Started

### Prerequisites

- Node.js >= 20
- PNPM >= 9
- PostgreSQL 16
- Redis 7
- MinIO (optional, for file uploads)

### Quick Start (Docker)

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Run migrations
cd apps/api && npx prisma migrate dev

# Seed database
cd apps/api && pnpm run db:seed
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd apps/api && npx prisma generate

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials

# Run migrations
cd apps/api && npx prisma migrate dev

# Seed database
cd apps/api && pnpm run db:seed

# Start development server
pnpm run dev
```

### Environment Variables

```env
# App
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://smarttable:smarttable@localhost:5432/smarttable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=smarttable

# Swagger
SWAGGER_ENABLED=true
```

## API Documentation

Swagger UI available at `http://localhost:3000/docs` when `SWAGGER_ENABLED=true`.

### Key Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/v1/auth` | Login, register, refresh, logout |
| Restaurants | `/api/v1/restaurants` | Restaurant CRUD |
| Branches | `/api/v1/branches` | Branch management |
| Tables | `/api/v1/tables` | Table management |
| Categories | `/api/v1/categories` | Category hierarchy |
| Products | `/api/v1/products` | Menu products |
| Orders | `/api/v1/orders` | Order workflow |
| Payments | `/api/v1/payments` | Payment processing |
| Reviews | `/api/v1/reviews` | Customer reviews |
| Notifications | `/api/v1/notifications` | Push notifications |
| Analytics | `/api/v1/analytics` | Dashboard data |
| Health | `/api/v1/health` | Health checks |
| Metrics | `/metrics` | Prometheus metrics |

## Real-time Events (Socket.IO)

Connect to `/ws` namespace. Join restaurant room for tenant-isolated events:

```javascript
socket.emit('join_restaurant', { restaurantId: 1 });

// Listen for events
socket.on('new_order', (data) => { /* ... */ });
socket.on('order_accepted', (data) => { /* ... */ });
socket.on('payment_completed', (data) => { /* ... */ });
```

## Scripts

```bash
pnpm run dev          # Start dev server with hot reload
pnpm run build        # Build for production
pnpm run start:prod   # Start production server
pnpm run lint         # Lint with ESLint + Prettier
pnpm run test         # Run unit tests
pnpm run test:e2e     # Run E2E tests
pnpm run test:cov     # Run tests with coverage
pnpm run db:generate  # Generate Prisma client
pnpm run db:migrate   # Run migrations (dev)
pnpm run db:seed      # Seed database
pnpm run db:studio    # Open Prisma Studio
```

## Testing

```bash
# Unit tests
cd apps/api && pnpm run test

# E2E tests
cd apps/api && pnpm run test:e2e

# Coverage
cd apps/api && pnpm run test:cov
```

## Docker

```bash
# Production
docker compose up -d

# Development (with hot reload)
docker compose -f docker-compose.dev.yml up -d

# Build production image
docker build -f apps/api/Dockerfile -t smarttable-api .
```

## CI/CD

GitHub Actions pipeline runs on push to `main`/`develop` and PRs:

1. **Lint** - ESLint + Prettier check
2. **Test** - Unit tests with PostgreSQL + Redis services
3. **Build** - TypeScript compilation
4. **Docker** - Image build (on main only)

## License

MIT
