# Schema Books — Web Frontend

Secure multi-tenant bookkeeping and tax dashboard built with Next.js 15, TypeScript, and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Application display name | Schema Books |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | http://localhost:4000/api |

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/              # Authentication page
│   ├── dashboard/          # KPI overview
│   ├── ledger/             # Ledger table with tabs
│   ├── receipts/           # Receipt upload & management
│   └── reports/            # Report generation & export
├── components/             # Shared components
│   ├── ui/                 # Primitive UI components (Button, Input, etc.)
│   ├── AppShell.tsx        # Authenticated layout wrapper
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Header.tsx          # Top bar with selectors
│   ├── LedgerTable.tsx     # Full ledger table with groups
│   └── DetailDrawer.tsx    # Slide-out entry detail panel
├── context/
│   └── AuthContext.tsx     # Auth state, business/FY selection
├── hooks/
│   └── useLedger.ts        # Ledger data fetching with category merge
├── lib/
│   ├── api.ts              # HTTP client with token refresh
│   ├── logger.ts           # Structured JSON event logging
│   └── format.ts           # Currency & date formatters
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

## Theme System

All colors use CSS custom variables defined in `globals.css`. Themes are applied via `data-theme` on `<html>`. To add a new theme, define a new `[data-theme="your-theme"]` block with the same variable names.

## Key Decisions

- **No frontend aggregation**: All totals come from the backend. Net income is the only client-computed value (income - expenses).
- **Category parity**: The frontend merges the category list with ledger totals, filling missing categories with zeroes to preserve Excel template ordering.
- **Immutable entries**: No inline editing. Ledger cells open a read-only detail drawer.
- **Structured logging**: Every significant event is logged as structured JSON with correlation IDs.
- **Token refresh**: Transparent 401 retry with single-flight refresh token request.

## Accessibility

- WCAG 2.1 AA compliant
- Full keyboard navigation across all interactive elements
- ARIA labels, roles, and states on all complex widgets
- Visible focus indicators using the accent color
- Semantic HTML throughout
