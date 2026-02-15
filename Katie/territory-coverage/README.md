# Territory Coverage

A Next.js (App Router) + TypeScript + Tailwind + shadcn/ui web app for visualizing and managing sales rep territory coverage across the US.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui (Radix primitives)
- **Database**: SQLite + Prisma (file-based, no server required)
- **Auth**: NextAuth.js v5 (Credentials)
- **Map**: MapLibre GL

## Setup

### Prerequisites

- Node.js 18+
- npm (or pnpm)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

- `AUTH_SECRET` – Secret for session signing (generate with `openssl rand -base64 32`)

SQLite is used by default (no database setup required). The database file is created at `prisma/dev.db`.

### 3. Database setup

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:seed` | Seed database (user, groups, reps, territories) |

## Default Login

- **Username**: `kpursel3`
- **Password**: `iloveyou`

## Data

- **Roster**: `data/import/roster.csv` (Name, Group, Territory)
- **States GeoJSON**: `public/data/geo/states.geojson`
- **Counties GeoJSON**: Fetched on demand from `/api/geo/counties/[STATE]` (lazy-loaded, cached to `public/data/geo/counties/`)

## Features

- **Dashboard** (`/`): Group checklist, map with group/rep modes, zebra hatch for overlaps, legend
- **Groups** (`/groups`): CRUD groups, edit color, manage reps
- **Rep Territory** (`/reps/[id]/territory`): List states, edit counties per state via modal with county map
