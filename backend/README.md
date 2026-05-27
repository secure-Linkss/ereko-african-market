# EREKO Market — Backend API

Enterprise-grade NestJS backend for the EREKO African Food E-Commerce platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (LTS) |
| Framework | NestJS 10 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Cache / Queue | Redis 7 |
| Queue processor | BullMQ |
| Auth | JWT (RS256) + httpOnly refresh cookies |
| Payments | Stripe |
| File uploads | Cloudinary |
| Email | SMTP (Postmark / SES / Resend) |
| Containerisation | Docker + Docker Compose |
| API docs | Swagger / OpenAPI 3.0 |

## Quick Start (Development)

### Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose
- A Stripe account (test keys)

### 1. Clone & Install

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — fill in Stripe keys, JWT secrets (openssl rand -base64 64)
```

### 3. Start Infrastructure

```bash
docker compose up postgres redis -d
```

### 4. Migrate & Seed

```bash
npm run prisma:migrate   # apply migrations
npm run prisma:seed      # optional: seed categories, warehouses
```

### 5. Start API

```bash
npm run start:dev
```

API: http://localhost:3001/api/v1  
Swagger: http://localhost:3001/api/docs

---

## API Reference

Base URL: `https://api.ereko.market/api/v1`

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

Mutable endpoints on `/checkout/*` and `/admin/*` require: `Idempotency-Key: <uuid>`

### Error Format (RFC 7807)

```json
{
  "type": "https://ereko.market/errors/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "instance": "/api/v1/auth/login",
  "trace_id": "a8f3...",
  "errors": {
    "email": ["email must be an email"]
  }
}
```

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login (password or magic link) |
| POST | `/auth/signup` | Public | Register new user |
| POST | `/auth/mfa/verify` | Public | Verify MFA code |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/refresh` | Cookie | Rotate refresh token → new access token |
| POST | `/auth/logout` | Bearer | Revoke refresh token |

### Profile Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profiles/me` | Bearer | Get current user profile |
| GET | `/profiles/addresses` | Bearer | List saved addresses |
| POST | `/profiles/addresses` | Bearer | Create address |
| PATCH | `/profiles/addresses/:id` | Bearer | Update address |
| DELETE | `/profiles/addresses/:id` | Bearer | Delete address |
| GET | `/profiles/cards` | Bearer | List saved payment cards |
| DELETE | `/profiles/cards/:id` | Bearer | Remove saved card |
| GET | `/profiles/loyalty` | Bearer | Get loyalty account |

### Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Public | List products (filter, sort, paginate) |
| GET | `/products/:slug` | Public | Get product by slug |
| GET | `/categories` | Public | List all categories |
| GET | `/search` | Public | Full-text search |

### Cart Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cart` | Optional | Get cart |
| POST | `/cart/sync` | Optional | Sync local cart |
| GET | `/cart/items` | Optional | List cart items |
| GET | `/cart/items/:id` | Optional | Get cart item |
| POST | `/cart/coupon` | Bearer | Apply promo code |
| POST | `/cart/loyalty/redeem` | Bearer | Redeem loyalty points |

### Checkout Endpoints

| Method | Path | Auth | Idempotency | Description |
|--------|------|------|-------------|-------------|
| POST | `/checkout/start` | Bearer | Required | Start checkout, reserve stock |
| POST | `/checkout/payment-intent` | Bearer | Required | Create Stripe PaymentIntent |
| POST | `/checkout/confirm` | Bearer | Required | Confirm order after Stripe |
| GET | `/checkout/delivery-slots` | Public | — | Get available delivery slots |

### Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/orders` | Bearer | List my orders (paginated) |
| GET | `/orders/:id` | Bearer | Get order detail |
| POST | `/orders/:orderId/returns` | Bearer | Submit return request |

### Recipe Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recipes` | Public | List recipes |
| GET | `/recipes/:slug` | Public | Get recipe |

### Cargo Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/cargo/inquire` | Optional | Submit cargo inquiry |
| POST | `/cargo/estimate` | Public | Get shipping estimate |
| GET | `/cargo/track/:trackingNumber` | Public | Track cargo |

### Admin Endpoints (isAdmin required)

| Method | Path | Auth | Idempotency | Description |
|--------|------|------|-------------|-------------|
| GET | `/admin/dashboard` | Bearer+Admin | — | Dashboard stats |
| GET | `/admin/orders` | Bearer+Admin | — | List all orders |
| PATCH | `/admin/orders/:id/status` | Bearer+Admin | Required | Update order status |
| GET | `/admin/inventory` | Bearer+Admin | — | Inventory list |
| POST | `/admin/inventory` | Bearer+Admin | — | Adjust stock |
| GET | `/admin/returns` | Bearer+Admin | — | List returns |
| POST | `/admin/returns/:id/resolve` | Bearer+Admin | Required | Approve/reject return |

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

---

## Database

### Migrations

```bash
npm run prisma:migrate        # dev: create + apply migration
npm run prisma:migrate:deploy # prod: apply existing migrations only
npm run prisma:studio         # open Prisma Studio GUI
```

---

## Production Deployment

### Docker

```bash
# Build & run all services
docker compose up -d

# Check logs
docker compose logs -f api
```

### Recommended Infrastructure

- **Compute**: 2× vCPU, 4GB RAM minimum (API)
- **Database**: PostgreSQL 16 on managed service (RDS, Supabase, Neon)
- **Cache**: Redis 7 on managed service (Upstash, ElastiCache)
- **CDN**: Cloudflare in front of the API
- **Monitoring**: Datadog / Grafana + Prometheus
- **Logs**: Loki / CloudWatch

### Stripe Webhook Setup

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Forward webhooks locally: `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe`
3. In production: add `https://api.ereko.market/api/v1/webhooks/stripe` in Stripe dashboard

Events to handle:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`
- `charge.refunded`

---

## Security

- All tokens are RS256 JWT
- Refresh tokens: httpOnly, Secure, SameSite=Strict cookies
- Refresh token rotation with family tracking (reuse = revoke all user tokens)
- Rate limiting: 100 req/min globally, 5 req/min on auth endpoints
- Helmet security headers
- SQL injection prevention via Prisma parameterised queries
- CORS restricted to configured origins
- Input validation on all endpoints via class-validator
- Idempotency keys prevent double-charges

---

## Loyalty Program

| Tier | Points Required | Earning Rate |
|------|----------------|--------------|
| Member | 0 | 10 pts/£ |
| Family | 500 | 10 pts/£ |
| Elder | 2,000 | 10 pts/£ |
| Royalty | 5,000 | 10 pts/£ |

1 loyalty point = 1 pence discount when redeemed.

---

*EREKO Backend — built for Africa, deployed globally.*
