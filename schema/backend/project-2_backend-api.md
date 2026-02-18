# Unified Tax & Bookkeeping Dashboard SaaS — System Overview (Shared Across All Projects)

This application turns an accountant-provided Excel template into a secure, modern dashboard that works on **desktop browsers** and **mobile (iOS + Android)** while keeping **one shared backend** so a user’s data is available anywhere.

## Core Architectural Principles

1. Backend is the **single source of truth**
2. Excel templates are treated as **schema definitions**, not data stores
3. No spreadsheet-style editing in-app — only controlled ledger posting
4. All financial-impacting actions are **immutable**
5. Last 3 rollback points + current head revision are maintained
6. Multi-tenant isolation is strictly enforced
7. Security and accessibility are first-class decisions
8. Persistent structured logging is mandatory from day one

---

# Persistent Logging & Audit Policy (Global Requirement)

Logging is NOT optional and must be implemented from initial development.

Every project must support structured, queryable logging that allows:

- Reconstructing any failure on first occurrence
- Reconstructing full user history
- Tracing cross-service events
- Identifying security anomalies
- Debugging race conditions and concurrency issues

## Events That MUST Be Logged

### Authentication
- Login attempts (success + failure)
- Logout
- Token refresh
- Password reset request
- Password reset completion

### Authorization & Access
- Business selection changes
- Permission changes
- User invitations
- Role updates

### Financial Impacting Actions
- Receipt upload init
- Receipt upload completion
- Receipt processing state change
- Receipt assignment (month/category)
- Ledger entry creation
- Ledger entry reversal
- Revision creation
- Rollback execution
- Export generation
- Template upload

### System State Changes
- Background job failures
- Retry attempts
- API validation failures
- Rate limit triggers
- Malware scan failures
- OCR extraction failures

### Infrastructure-Level Logging
- 4xx and 5xx responses (with correlation ID)
- Database transaction failures
- Storage access failures
- Third-party service failures

## Logging Requirements

- Structured JSON logs (never plain strings)
- Include correlation_id on every request
- Include user_id, account_id, business_id when applicable
- Include request_id and trace_id for distributed tracing
- Log BEFORE and AFTER states for mutation endpoints
- Never log sensitive data (passwords, full tokens, raw card numbers, etc.)
- Logs must be centralizable (ELK / Datadog / CloudWatch / etc.)

No feature is considered complete unless appropriate logging exists.

---

# System Communication Overview

Clients:
- Web (Next.js)
- iOS (SwiftUI)
- Android (Kotlin Compose)

All communicate with:

Backend API (NestJS + PostgreSQL + Object Storage + Redis + Job Queue)

All communication flows through authenticated REST endpoints defined in OpenAPI.

Signed upload URLs are used for file transfers to avoid routing large files through the API server.

---


<!--
CURSOR DIRECTIVE — MANDATORY FIRST OUTPUT

Before generating any code for this project, you must produce a complete TECH-SPEC document.

The tech-spec must include:

1. SYSTEM CONTEXT
   - How this project connects to Web, Backend, iOS, Android.
   - Required API contracts.
   - Dependency graph.
   - Environment assumptions.

2. DEPENDENCIES
   - Full dependency list with justification.
   - Security impact of each dependency.
   - Alternatives considered.

3. INTERFACE REQUIREMENTS
   - Exact endpoints consumed or exposed.
   - Authentication flow.
   - Error handling patterns.
   - Versioning strategy.

4. STARTUP & ENVIRONMENT SETUP
   - Full environment variable list.
   - Local setup instructions.
   - Docker requirements.
   - Required services (DB, Redis, Object Storage).
   - Migration + seed steps.
   - CI/CD expectations.

5. SECURITY REQUIREMENTS (TOP PRIORITY)
   - Token lifecycle.
   - Role-based access control.
   - Multi-tenant data isolation.
   - File validation.
   - Encryption in transit and at rest.
   - Rate limiting.
   - Audit log persistence.
   - Secure headers (where applicable).

6. ACCESSIBILITY REQUIREMENTS (TOP PRIORITY FOR UI PROJECTS)
   - WCAG compliance.
   - Keyboard navigation.
   - Screen reader compatibility.
   - Contrast standards.
   - Focus management.

7. FAILURE & EDGE CASE HANDLING
   - Network failures.
   - Partial uploads.
   - Concurrency conflicts.
   - Token expiration.
   - Offline behavior (mobile).

8. PERFORMANCE STRATEGY
   - Caching approach.
   - Pagination requirements.
   - Expected data sizes.
   - Background processing model.

9. LOGGING STRATEGY (MANDATORY)
   - Structured logging format.
   - Correlation ID usage.
   - Event taxonomy.
   - Centralized aggregation plan.
   - Retention policy.
   - Alerting thresholds.

10. DEFINITION OF DONE
   - Test coverage requirements.
   - Observability requirements.
   - Security review checklist.
   - Accessibility verification checklist.

Security, accessibility, and logging must be architectural decisions — not afterthoughts.

Do not generate implementation code until this tech-spec is fully defined and approved.
-->


# Project 2 — Backend API

Mission: Provide secure multi-tenant API with immutable ledger, revision control, and full audit logging.

Security Focus:
- RBAC enforcement
- Signed upload URLs
- Immutable ledger entries

Logging Focus:
- Every request must generate structured log entry
- All mutations log before/after state
- Background jobs log lifecycle
