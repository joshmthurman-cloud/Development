# Schema Books — Backend API

Secure multi-tenant REST API for the Schema Books Tax & Bookkeeping Dashboard SaaS.

Built with **NestJS + PostgreSQL + Redis + MinIO** (S3-compatible object storage).

## Features

- **JWT authentication** with access + refresh token rotation
- **RBAC** (Owner / Admin / Editor / Viewer) per business
- **Multi-tenant isolation** — all data is scoped to a business
- **Immutable ledger** — entries are never edited, only reversed
- **Revision control** — 3 rollback snapshots + current head
- **Signed upload URLs** — receipts and templates uploaded directly to object storage
- **Structured JSON logging** with correlation IDs on every request
- **Full audit trail** — every mutation logged with before/after state
- **OpenAPI / Swagger** documentation auto-generated

## Prerequisites

- Node.js 22+
- Docker & Docker Compose (for PostgreSQL, Redis, MinIO)

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed demo data
npx prisma db seed

# 6. Start dev server
npm run start:dev
```

The API will be available at `http://localhost:8901/api/v1`.

Swagger docs at `http://localhost:8901/api/v1/docs`.

## Demo Credentials

```
Email:    demo@schemabooks.com
Password: Password123!
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (revokes tokens) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| POST | `/users/me/change-password` | Change password |

### Businesses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses` | Create business |
| GET | `/businesses` | List user's businesses |
| GET | `/businesses/:id` | Get business |
| PATCH | `/businesses/:id` | Update business |
| POST | `/businesses/:id/members` | Invite member |
| PATCH | `/businesses/:id/members/:mid` | Update member role |
| DELETE | `/businesses/:id/members/:mid` | Remove member |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/:bid/categories` | Create category |
| GET | `/businesses/:bid/categories` | List categories |
| GET | `/businesses/:bid/categories/:cid` | Get category |
| PATCH | `/businesses/:bid/categories/:cid` | Update category |
| POST | `/businesses/:bid/categories/seed` | Seed defaults from template |

### Fiscal Years
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/:bid/fiscal-years` | Create fiscal year |
| GET | `/businesses/:bid/fiscal-years` | List fiscal years |
| GET | `/businesses/:bid/fiscal-years/:fid` | Get fiscal year |
| PATCH | `/businesses/:bid/fiscal-years/:fid` | Update fiscal year |

### Ledger (Immutable)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/.../fiscal-years/:fid/ledger` | Create entry |
| POST | `/.../ledger/:eid/reverse` | Reverse entry |
| GET | `/.../fiscal-years/:fid/ledger` | Query entries |
| GET | `/.../fiscal-years/:fid/ledger/summary` | Income/expense summary |

### Revisions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/.../fiscal-years/:fid/revisions` | Create snapshot |
| GET | `/.../fiscal-years/:fid/revisions` | List revisions |
| GET | `/.../revisions/:rid` | Get revision |
| POST | `/.../revisions/:rid/rollback` | Rollback |

### Receipts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/:bid/receipts/upload` | Get upload URL |
| POST | `/businesses/:bid/receipts/:rid/confirm` | Confirm upload |
| PATCH | `/businesses/:bid/receipts/:rid/assign` | Assign to entry |
| GET | `/businesses/:bid/receipts/:rid/download` | Get download URL |
| GET | `/businesses/:bid/receipts` | List receipts |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/:bid/templates/upload` | Get upload URL |
| GET | `/businesses/:bid/templates` | List templates |
| GET | `/businesses/:bid/templates/:tid` | Get template |
| GET | `/businesses/:bid/templates/:tid/download` | Get download URL |

### Office in Home
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/.../fiscal-years/:fid/office-in-home` | Upsert settings |
| GET | `/.../fiscal-years/:fid/office-in-home` | Get with deduction |
| POST | `/.../office-in-home/expenses` | Upsert expense |

### Fixed Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/.../fiscal-years/:fid/fixed-assets` | Record purchase |
| GET | `/.../fiscal-years/:fid/fixed-assets` | List assets |
| GET | `/.../fixed-assets/:aid` | Get asset |
| DELETE | `/.../fixed-assets/:aid` | Delete asset |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `STORAGE_ENDPOINT` | MinIO/S3 endpoint |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Storage credentials |

## Architecture

```
Client (Web/iOS/Android)
        │
        ▼
  NestJS API (JWT Auth + RBAC)
        │
  ┌─────┼─────────┐
  │     │         │
  ▼     ▼         ▼
 PostgreSQL  Redis  MinIO
 (data)    (cache)  (files)
```

All communication flows through authenticated REST endpoints with structured JSON logging and full audit trails.
