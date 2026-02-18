# Schema Books — Web Frontend Build Spec

## Branding

- **App Name:** Schema Books
- **Logo assets directory:** `C:\Development\Development\accountool\Images\Logo\`
  - `Logo.svg` — Full logo (brand mark + wordmark), use in sidebar header, login page
  - `Logo.png` — Full logo raster fallback
  - `Icon.svg` — Icon-only mark, use as favicon, collapsed sidebar, mobile header
  - `Icon.png` — Icon-only raster fallback
- Copy these into the frontend project at `public/brand/` during setup:
  - `public/brand/logo.svg`
  - `public/brand/logo.png`
  - `public/brand/icon.svg`
  - `public/brand/icon.png`
- Use `Icon.svg` as the **favicon** (convert to `.ico` or use SVG favicon in `app/layout.tsx`)
- Use `Logo.svg` in the **sidebar header** (expanded state) and on the **login/register pages**
- Use `Icon.svg` in the **sidebar header** (collapsed state) and as the **mobile header logo**
- Brand colors (derived from logo): deep navy `#1a3a5c`, teal/cyan `#2dd4bf`, white

---

## Mission

Build the **Next.js web frontend** for the Schema Books SaaS dashboard. This connects to the NestJS backend API (already built) and provides a secure, accessible, responsive interface for managing business income/expenses, receipts, and tax bookkeeping.

---

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | **Next.js 15 (App Router)** | Server components, API route proxying, SSR for SEO-irrelevant but perf-relevant pages |
| Language | **TypeScript** | End-to-end type safety matching the backend |
| Styling | **Tailwind CSS 4** | Utility-first, responsive by default, great DX |
| Component Library | **shadcn/ui** | Accessible, composable, not a dependency — copied into project |
| State Management | **TanStack Query (React Query)** | Server state caching, optimistic updates, auto-revalidation |
| Forms | **React Hook Form + Zod** | Type-safe validation, minimal re-renders |
| Charts | **Recharts** | Lightweight, composable, React-native charts |
| Auth | **httpOnly cookie for refresh token + memory for access token** | Secure — no tokens in localStorage |
| HTTP Client | **ky** or **fetch wrapper** | Lightweight, interceptor support for auth headers |
| Testing | **Vitest + Playwright** | Unit + E2E coverage |
| Logging | **Structured client-side logging** | Captures UI events, failed API calls, user actions |

---

## Backend API Reference

The backend is running at `http://localhost:3000/api/v1` (configurable via `NEXT_PUBLIC_API_URL`).

Full Swagger docs available at `/api/v1/docs` when backend is running.

### Authentication Endpoints

```
POST /auth/register        — { email, password, firstName, lastName } → { user, accessToken, refreshToken }
POST /auth/login           — { email, password } → { user, accessToken, refreshToken }
POST /auth/refresh         — { refreshToken } → { accessToken, refreshToken }
POST /auth/logout          — (requires JWT) → { message }
```

### User Endpoints

```
GET    /users/me                    — Get current user + business memberships
PATCH  /users/me                    — Update profile { firstName?, lastName? }
POST   /users/me/change-password    — { currentPassword, newPassword }
```

### Business Endpoints

```
POST   /businesses                           — Create business { name }
GET    /businesses                           — List user's businesses
GET    /businesses/:businessId               — Get business details + members
PATCH  /businesses/:businessId               — Update business
POST   /businesses/:businessId/members       — Invite member { email, role }
PATCH  /businesses/:businessId/members/:mid  — Update member role
DELETE /businesses/:businessId/members/:mid  — Remove member
```

### Category Endpoints

```
POST /businesses/:bid/categories       — Create { name, group, parentId? }
GET  /businesses/:bid/categories       — List all (hierarchical)
GET  /businesses/:bid/categories/:cid  — Get single
PATCH /businesses/:bid/categories/:cid — Update
POST /businesses/:bid/categories/seed  — Seed defaults from Excel template
```

### Fiscal Year Endpoints

```
POST  /businesses/:bid/fiscal-years        — Create { year, carryover? }
GET   /businesses/:bid/fiscal-years        — List all
GET   /businesses/:bid/fiscal-years/:fid   — Get single
PATCH /businesses/:bid/fiscal-years/:fid   — Update { carryover?, mileageDriven? }
```

### Ledger Endpoints (Immutable)

```
POST /businesses/:bid/fiscal-years/:fid/ledger              — Create entry { categoryId, accountType, month, amount, description? }
POST /businesses/:bid/fiscal-years/:fid/ledger/:eid/reverse — Reverse entry (creates negating entry)
GET  /businesses/:bid/fiscal-years/:fid/ledger              — Query entries (filter by accountType, month, categoryId; paginated)
GET  /businesses/:bid/fiscal-years/:fid/ledger/summary      — Full income/expense summary by month + category
```

**AccountType enum:** `BANK`, `CREDIT_CARD`, `PERSONALLY_PAID`

### Revision Endpoints

```
POST /businesses/:bid/fiscal-years/:fid/revisions                — Create snapshot { description? }
GET  /businesses/:bid/fiscal-years/:fid/revisions                — List all
GET  /businesses/:bid/fiscal-years/:fid/revisions/:rid           — Get with full snapshot
POST /businesses/:bid/fiscal-years/:fid/revisions/:rid/rollback  — Rollback to this revision
```

### Receipt Endpoints

```
POST  /businesses/:bid/receipts/upload          — Request signed upload URL { filename, mimeType, fileSize, ledgerEntryId? }
POST  /businesses/:bid/receipts/:rid/confirm    — Confirm upload complete
PATCH /businesses/:bid/receipts/:rid/assign     — Assign to ledger entry { ledgerEntryId }
GET   /businesses/:bid/receipts/:rid/download   — Get signed download URL
GET   /businesses/:bid/receipts                 — List receipts (paginated)
```

### Template Endpoints

```
POST /businesses/:bid/templates/upload          — Request signed upload URL { filename, fileSize }
GET  /businesses/:bid/templates                 — List templates
GET  /businesses/:bid/templates/:tid            — Get template
GET  /businesses/:bid/templates/:tid/download   — Get signed download URL
```

### Office in Home Endpoints

```
PUT  /businesses/:bid/fiscal-years/:fid/office-in-home           — Upsert settings { officeSquareFootage?, totalSquareFootage? }
GET  /businesses/:bid/fiscal-years/:fid/office-in-home           — Get data with deduction calc
POST /businesses/:bid/fiscal-years/:fid/office-in-home/expenses  — Upsert expense { category, month, amount }
```

### Fixed Asset Endpoints

```
POST   /businesses/:bid/fiscal-years/:fid/fixed-assets            — Record purchase { purchaseDate, description, amountPaid }
GET    /businesses/:bid/fiscal-years/:fid/fixed-assets            — List assets + total
GET    /businesses/:bid/fiscal-years/:fid/fixed-assets/:aid       — Get asset
DELETE /businesses/:bid/fiscal-years/:fid/fixed-assets/:aid       — Delete asset
```

### Health

```
GET /health — { status, checks: { database, redis } }
```

---

## Page Structure & Routing

```
/                                → Landing / redirect to /dashboard
/login                           → Login page
/register                        → Registration page
/dashboard                       → Business selector + overview
/dashboard/[businessId]          → Business overview (fiscal year selector, summary cards)
/dashboard/[businessId]/ledger   → Main ledger view (mirrors "Income & Expenses" sheet)
/dashboard/[businessId]/credit-card → Credit card account view
/dashboard/[businessId]/personal → Personally paid expenses view
/dashboard/[businessId]/summary  → Annual summary (mirrors "Summary" sheet)
/dashboard/[businessId]/receipts → Receipt management (upload, assign, browse)
/dashboard/[businessId]/oih      → Office in Home calculator
/dashboard/[businessId]/assets   → Fixed asset tracker
/dashboard/[businessId]/revisions → Revision history + rollback
/dashboard/[businessId]/settings → Business settings, members, templates
/profile                         → User profile + password change
```

---

## Core UI Components

### Layout
- **AppShell** — Sidebar navigation + top bar with user menu + business selector
- **Sidebar** — Collapsible, icon + text, responsive (drawer on mobile)
- **TopBar** — Business name, fiscal year dropdown, user avatar/menu

### Dashboard
- **SummaryCards** — Total income, total expenses, net profit, carry-over
- **MonthlyChart** — Bar/line chart showing income vs expenses by month
- **RecentActivity** — Last 10 ledger entries

### Ledger View (Main)
- **LedgerTable** — Rows = categories, Columns = months (Jan–Dec) + Total, matches Excel layout
- **AccountTypeToggle** — Switch between Bank / Credit Card / Personally Paid
- **AddEntryModal** — Form to post a new ledger entry (category, month, amount, description)
- **ReverseEntryDialog** — Confirmation dialog to reverse an entry
- **EntryDetailDrawer** — Shows entry details, linked receipts, reversal info

### Receipt Manager
- **UploadZone** — Drag-and-drop file upload with signed URL flow
- **ReceiptGallery** — Grid/list of uploaded receipts with status badges
- **AssignDialog** — Link receipt to a ledger entry (select from dropdowns)

### Office in Home
- **OihForm** — Square footage inputs with live deduction percentage calculation
- **OihExpenseTable** — Monthly expense grid (Internet, Gas, Electric, Water, etc.)
- **DeductionSummary** — Calculated deduction amount displayed prominently

### Fixed Assets
- **AssetTable** — Date, description, amount columns
- **AddAssetForm** — Date picker, description, amount

### Revisions
- **RevisionTimeline** — Visual timeline showing last 4 revisions
- **SnapshotPreview** — Read-only view of snapshot data before rollback
- **RollbackConfirmation** — Multi-step confirmation (this is destructive)

### Settings
- **MemberList** — Shows members with roles, invite button
- **InviteMemberForm** — Email + role selector
- **TemplateUpload** — Upload area for Excel templates

---

## Authentication Flow

1. **Login/Register** → Backend returns `{ accessToken, refreshToken }`
2. Store `accessToken` in memory (React state / context) — NOT localStorage
3. Store `refreshToken` in httpOnly secure cookie (set via Next.js API route proxy)
4. Every API request includes `Authorization: Bearer <accessToken>` header
5. On 401 response → automatically call `/auth/refresh` with cookie
6. On refresh failure → redirect to `/login`
7. **Logout** → call `/auth/logout`, clear cookie, clear memory state

### Next.js API Route Proxy

Create `/app/api/auth/[...path]/route.ts` to proxy auth endpoints and manage httpOnly cookies:
- `/api/auth/login` → Proxies to backend, sets refreshToken as httpOnly cookie, returns accessToken
- `/api/auth/refresh` → Reads cookie, calls backend refresh, rotates cookie
- `/api/auth/logout` → Calls backend logout, clears cookie

---

## Security Requirements

- **CSP headers** — Strict Content-Security-Policy via Next.js middleware
- **No tokens in localStorage** — Access token in memory, refresh token in httpOnly cookie
- **CSRF protection** — Same-site cookie + custom header validation
- **Rate limiting display** — Show user-friendly message on 429 responses
- **Input sanitization** — Zod schemas validate all form inputs before API submission
- **Secure headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy via middleware

---

## Accessibility Requirements (WCAG 2.1 AA)

- All interactive elements keyboard-navigable
- Tab order follows logical document flow
- Focus visible indicators on all focusable elements
- ARIA labels on all icon-only buttons
- ARIA live regions for dynamic content updates (toasts, table updates)
- Color contrast ratio minimum 4.5:1 for text, 3:1 for large text
- Form inputs have associated labels
- Error messages linked to inputs via `aria-describedby`
- Skip-to-content link on every page
- Screen reader announcements for loading states and page transitions

---

## Logging Strategy (Client-Side)

Structured logging that can be sent to the backend or a log aggregation service.

### Events to Log
- Page navigation
- Login/logout/register attempts (success/failure)
- API call failures (4xx and 5xx) with correlation ID
- Form validation errors
- File upload initiation/completion/failure
- Ledger entry creation/reversal
- Revision creation/rollback
- Business context switches
- Unhandled JavaScript errors

### Format
```json
{
  "timestamp": "ISO-8601",
  "level": "info|warn|error",
  "event": "ledger.entry_created",
  "userId": "uuid",
  "businessId": "uuid",
  "correlationId": "from-response-header",
  "metadata": { }
}
```

---

## Performance Strategy

- **React Query** caching with 5-minute stale time for read data
- **Optimistic updates** for ledger entry creation
- **Pagination** for ledger entries (default 100 per page) and receipts (default 50)
- **Lazy loading** for chart components
- **Image optimization** via Next.js Image component for receipt thumbnails
- **Route-based code splitting** (automatic with App Router)

---

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=Schema Books
```

---

## Definition of Done

- [ ] All pages render without errors
- [ ] Authentication flow works end-to-end (register, login, refresh, logout)
- [ ] Ledger view displays data matching Excel template structure
- [ ] Entries can be created and reversed
- [ ] Receipts can be uploaded and assigned
- [ ] Summary calculations match backend summary endpoint
- [ ] Office in Home deduction calculates correctly
- [ ] Fixed assets can be tracked
- [ ] Revisions can be created and rolled back
- [ ] All forms validate with Zod schemas
- [ ] Keyboard navigation works on all interactive elements
- [ ] Screen reader tested on at least 2 pages
- [ ] No console errors in production build
- [ ] Structured logging is capturing events
- [ ] Mobile responsive (375px to 1920px)
