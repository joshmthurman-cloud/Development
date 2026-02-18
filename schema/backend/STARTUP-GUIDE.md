# Schema Books — Backend Startup Guide

Server: Ubuntu (curbstonewebtest)
Path: `~/Development/schema/backend`

---

## Prerequisites

- **Docker** — `docker --version` (v29+)
- **Docker Compose** — `docker compose version` (v2+)
- **Node.js** — `node --version` (v20+)
- **npm** — `npm --version` (v10+)
- User must be in the `docker` group: `sudo usermod -aG docker $USER` (logout/login after)

## First-Time Setup

Run these steps in order from `~/Development/schema/backend`:

### 1. Create `.env` from template

```bash
cp .env.example .env
sed -i "s/change-me-access-secret-min-32-chars\!\!/$(openssl rand -hex 32)/" .env
sed -i "s/change-me-refresh-secret-min-32-chars\!\!/$(openssl rand -hex 32)/" .env
```

### 2. Start infrastructure (Postgres, Redis, MinIO)

```bash
docker compose up -d
docker compose ps   # all 3 should show "healthy"
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed demo data

```bash
npx prisma db seed
```

### 7. Start the dev server

```bash
npm run start:dev
```

### 8. Verify

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{"status":"healthy","checks":{"database":"ok","redis":"ok"}}
```

## Day-to-Day Startup (after first-time setup)

```bash
cd ~/Development/schema/backend
docker compose up -d
npm run start:dev
```

Verify: `curl http://localhost:3000/api/v1/health`

## Shutdown

```bash
# Stop NestJS: Ctrl+C in the terminal running start:dev

# Stop infrastructure
docker compose down
```

## Useful Commands

| Command | Purpose |
|---------|---------|
| `docker compose ps` | Check container status |
| `docker compose logs -f postgres` | Tail Postgres logs |
| `npx prisma studio` | Visual database browser (port 5555) |
| `npx prisma migrate dev --name <name>` | Create new migration |
| `npx prisma db seed` | Re-run seed |
| `npm run start:debug` | Start with debugger attached |

## Ports

| Service | Port |
|---------|------|
| NestJS API | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## API

- Base URL: `http://localhost:3000/api/v1`
- Swagger Docs: `http://localhost:3000/api/v1/docs`
- Demo login: `demo@schemabooks.com` / `Password123!`
