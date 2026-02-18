
# Schema Books — Web Frontend Build Specification (v2)

---

# Unified System Overview

Schema Books is a secure multi-tenant bookkeeping and tax dashboard platform.

Core Principles:
1. Backend is the single source of truth.
2. Excel templates are treated as schema definitions.
3. No spreadsheet-style editing in-app.
4. Immutable ledger entries.
5. Last 3 rollback points + current revision maintained.
6. Multi-tenant isolation strictly enforced.
7. Security and accessibility are first-class decisions.
8. Persistent structured logging is mandatory from day one.
9. Theme system must be fully swappable without component rewrites.

---

# Branding & Theme System

## Brand Name
Schema Books

## Default Brand Palette (derived from logo)

Primary Deep Blue: #004070  
Accent Teal: #10C0C0  
Hover Blue: #003050  
Secondary Blue: #104070  
Supporting Teals: #10B0C0, #10A0B0, #10D0D0  

## Theme Architecture (MANDATORY)

All colors must use CSS variables and semantic tokens. No hardcoded colors allowed.

Define root variables:

--sb-primary
--sb-accent
--sb-bg
--sb-surface
--sb-border
--sb-text
--sb-muted
--sb-success
--sb-danger
--sb-warning

Theme switching must rely on:
data-theme="schema-books"

Future themes must be swappable without touching components.

---

# Design System Rules

Radius:
- Cards: 16px
- Inputs/Buttons: 12px
- Pills: 9999px

Shadows:
- One subtle card elevation
- One modal elevation
- No stacked shadows

Borders:
- Soft borders, low contrast, no heavy outlines

Spacing:
- 24px section rhythm
- 16–20px card padding

Typography:
- KPI numbers: 32–40px semibold
- Labels: 12–14px muted
- Table body: 13–14px

Accessibility:
- WCAG 2.1 AA minimum
- Full keyboard navigation
- Proper ARIA labeling
- Visible focus states
- High contrast text on all surfaces

---

# Environment Variables

NEXT_PUBLIC_APP_NAME=Schema Books
NEXT_PUBLIC_API_URL=<backend_url>

---

# Ledger Summary Response Contract (NO FRONTEND AGGREGATION)

Endpoint:
GET /businesses/:bid/fiscal-years/:fid/ledger/summary

Response Rules:

categoryTotals:
- Array
- Each item includes:
  - name
  - group
  - total
  - monthly object keyed 1–12
- Must render directly without aggregation.

monthlyTotals:
- Provides summary row
- income and expenses precomputed
- net = income - expenses (calculated client-side only)

---

# Account Type Filtering

Query param ?accountType drives sheet view:

?accountType=BANK → Income & Expenses view  
?accountType=CREDIT_CARD → Credit Card view  
?accountType=PERSONALLY_PAID → Personally Paid view  
No param → Combined Summary view  

Same endpoint. Same response shape.

---

# Category Parity Requirement

Because categoryTotals only returns categories with entries:

Frontend must:

1. Fetch categories:
GET /businesses/:bid/categories

2. Merge with summary response
3. Fill missing categories with zeroed monthly values
4. Preserve Excel template ordering

Ledger table must always reflect full template structure.

---

# Ledger UI Behavior Requirements

- Tabs: Summary | Bank | Credit Card | Personally Paid
- Tab switch must preserve scroll and expanded group state
- No flicker on tab change
- Stable category order
- Frozen left column
- Sticky header row
- Expandable category groups
- Clicking a cell opens detail drawer
- No inline editing allowed

---

# Logging Requirements (Frontend)

Every event must log:

- route
- sheetTab
- fiscalYearId
- businessId
- correlationId
- uiComponent
- action
- timestamp

Events to log:
- Login success/failure
- Logout
- Token refresh failures
- Business switch
- Receipt upload init
- Receipt upload failure
- Receipt confirm
- Ledger entry post
- Ledger reversal
- Export request
- Rollback request
- All 4xx and 5xx API responses

Logs must be structured JSON.

---

# Cursor Directive (MANDATORY FIRST OUTPUT)

Before generating any code, Cursor must produce a complete TECH-SPEC including:

1. System context and dependency graph
2. Full dependency list with justification
3. Security strategy (TOP PRIORITY)
4. Accessibility plan (TOP PRIORITY)
5. Logging architecture
6. Startup instructions
7. CI/CD requirements
8. Failure and edge case handling
9. Performance considerations
10. Design system appendix
11. Definition of Done checklist

No implementation code until tech-spec is approved.

Security, accessibility, logging, and theme architecture are architectural decisions — not afterthoughts.
