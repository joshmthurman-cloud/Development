# Unified Tax & Bookkeeping Dashboard SaaS — Web Frontend Project

This document defines the Web Frontend project in alignment with the overall multi-project architecture.

---

## Global System Overview (Shared Architecture)

This application turns an accountant-provided Excel template into a secure, modern dashboard that works on:

- Desktop browsers (primary Web UI)
- iOS native app
- Android native app

All clients connect to a single secure backend API.

Core Principles:
1. Backend is the single source of truth.
2. Excel templates are treated as schema definitions.
3. No spreadsheet-style editing in-app.
4. Immutable ledger entries.
5. Last 3 rollback points + current head revision maintained.
6. Multi-tenant isolation strictly enforced.
7. Security and accessibility are first-class decisions.
8. Persistent structured logging is mandatory from day one.

---

## Persistent Logging & Audit Policy (Mandatory)

Logging is required from initial development.

The Web frontend must log:

- Login attempts (success/failure)
- Logout
- Token refresh failures
- Business selection changes
- Receipt upload init
- Receipt upload failure
- Receipt posting attempts
- Export requests
- Rollback requests
- All 4xx and 5xx API responses

Requirements:
- Structured logs (JSON)
- Correlation ID attached to every request
- Never log sensitive data
- Logs must support centralized aggregation

No feature is complete without proper logging.

---

## Project 1 — Web Frontend UI

### Mission

Build a secure, accessible, responsive web dashboard with strict adherence to backend API contracts.

This application:
- Implements authentication flow
- Displays dashboards and metrics
- Manages receipt upload & posting workflow
- Handles exports and revisions
- Enforces accessibility standards
- Integrates structured logging

---

## Recommended Stack

Core:
- Next.js (App Router) + TypeScript
- React
- Tailwind CSS + shadcn/ui
- TanStack Query
- Zod
- React Hook Form

Security:
- httpOnly secure cookies for refresh tokens
- Strict CSP and security headers
- No access token in localStorage

Accessibility:
- WCAG 2.1 AA compliance
- Full keyboard navigation
- Proper ARIA labels
- High contrast support
- Focus management in modals

Tooling:
- ESLint + Prettier
- Playwright (E2E)
- Vitest/Jest (unit testing)

---

## Required API Integration

Must use backend OpenAPI contract.

Endpoints consumed:

Auth:
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

Receipts:
- POST /receipts/upload/init
- POST /receipts/upload/complete
- GET /receipts
- GET /receipts/{id}

Ledger:
- POST /ledger/entries
- GET /ledger/entries
- POST /ledger/entries/{id}/reverse

Metrics:
- GET /metrics/overview

Exports:
- POST /exports/accountant
- GET /exports
- GET /exports/{id}/download

Revisions:
- GET /revisions
- POST /revisions/{id}/rollback

---

## Required Features

1. Login & Authentication Flow
2. Business Selection
3. Receipt Upload (signed URL flow)
4. Receipt Review & Posting
5. Ledger View (read-only + reversal)
6. Dashboard Metrics
7. Exports
8. Revision Rollback Interface

---

## CURSOR DIRECTIVE — MUST EXECUTE FIRST

Before generating code, produce a complete TECH-SPEC including:

1. System context and dependency graph
2. Full dependency list with justification
3. Security requirements (top priority)
4. Accessibility requirements (top priority)
5. Logging strategy
6. Startup instructions
7. CI/CD expectations
8. Failure handling plan
9. Performance considerations
10. Definition of Done checklist

Do NOT generate implementation code until the tech-spec is approved.

Security, accessibility, and logging are architectural decisions — not afterthoughts.
