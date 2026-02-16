# Curbstone Dashboard – Style Guide

This document describes the design tokens and component classes used by the Terminal Status Monitor UI so new components can be styled consistently.

---

## Design tokens (`:root` in `static/css/curbstone-dashboard.css`)

### Brand palette
| Token | Hex | Usage |
|-------|-----|--------|
| `--color-primary` | #5693b3 | Primary actions, links, “online” state |
| `--color-primary-hover` | #47819e | Primary button hover |
| `--color-light` | #bfd1e5 | Secondary surfaces, “Online At Least Once” accent; use with dark text for contrast |
| `--color-accent` | #c97c5d | Warnings, “Always Offline,” admin actions |
| `--color-slate` | #474954 | Dark slate: topbar, body text, headings |

### Surfaces
- `--bg-page`: Page background (#f6f8fb, light tint).
- `--bg-card`: Card/panel background (#ffffff).
- `--bg-topbar`: Header bar (#474954).
- `--border-subtle`: Light borders (rgba(71,73,84,0.12)).
- `--shadow-card` / `--shadow-card-hover`: Card shadows.

### Typography
- `--font-sans`: `'Inter', …` (loaded via Google Fonts).
- `--text-body`, `--text-muted`, `--text-inverse`: Body, secondary, and inverse text.

### Spacing & radii
- Spacing: `--space-xs` (4px) through `--space-2xl` (40px).
- Radii: `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (12px).
- Focus: `--focus-ring`: 2px outline using primary.

Use these variables for new UI so the dashboard stays consistent and easy to theme.

---

## Class naming (BEM-like)

- **Block**: e.g. `.topbar`, `.card`, `.kpi-card`.
- **Element**: `__` (e.g. `.topbar__title`, `.panel__header`).
- **Modifier**: `--` (e.g. `.kpi-card--offline`, `.badge--online`).

Combine with existing IDs where behavior or JS depends on them (e.g. `#terminalsTable`, `#merchantFilter`); do not remove those IDs.

---

## Layout & shell

- **`.app-shell`** – Root wrapper (e.g. on `<body>`); flex column, min-height 100vh.
- **`.container`** – Main content width (max-width 1400px, horizontal padding).
- **`.topbar`** – Dark header bar (background `--bg-topbar`).
  - **`.topbar__inner`** – Inner flex container.
  - **`.topbar__left`** / **`.topbar__center`** / **`.topbar__right`** – Regions.
  - **`.topbar__title`** – Page title (e.g. “Terminal Status Monitor”).
  - **`.topbar__actions`** – Button group (e.g. Run Check, Reload TPNs, user menu).
  - **`.topbar__logo`** – Logo image size.
  - **`.topbar__meta`** – Secondary text (countdown, counts).

---

## Buttons

- **`.btn`** / **`.btn-primary`** – Filled primary (#5693b3); min-height 40px, rounded, hover state.
- **`.btn-secondary`** – Outlined; border `--color-light`, transparent background, hover tint.
- **`.btn-ghost`** – No border; subtle hover background.

Use a single logical class per button (e.g. `class="btn btn-primary"`). Keep existing `onclick` and `id` where used by JS.

---

## Form controls

- **`.input`** – Text/date inputs: rounded (10px), subtle border, focus ring (primary).
- **`.select`** – `<select>`: same treatment, min-width 200px (e.g. 280px in filter form).
- **`.filter-form`** – Flex row for filter row (merchant + TPN + buttons).

---

## Cards & panels

- **`.card`** – White panel: 12px radius, light shadow, border, padding.
- **`.panel`** – Same surface; use with **`.panel__header`** for a headed block.
- **`.panel__header`** – Section title with bottom border (e.g. “Count by Merchant”).
- **`.section`** – Vertical spacing between major sections.
- **`.section__title`** – Section heading (e.g. “All Terminals”, “Filter by Merchant”).
- **`.section__subtitle`** – Smaller supporting text.

---

## KPI cards

- **`.kpi-card`** / **`.analytics-card`** – Base card with top accent bar (4px) and optional hover shadow.
- **`.kpi-card--offline`** – Accent bar #c97c5d (Always Offline).
- **`.kpi-card--online`** – Accent bar #5693b3 (Always Online).
- **`.kpi-card--once`** – Accent bar #bfd1e5 (Online At Least Once); keep text in `--color-slate` for contrast.
- **`.kpi-value`** – Large number (e.g. 2.5rem, bold).
- **`.kpi-meta`** – Supporting line (e.g. “X% of Y terminals”).

---

## Status badges (pills)

- **`.status`** – Base pill (rounded, small caps).
- **`.status.ONLINE`** / **`.badge--online`** – Background rgba(86,147,179,0.14), text #5693b3.
- **`.status.OFFLINE`** / **`.status.DISCONNECT`** / **`.badge--offline`** – Background rgba(201,124,93,0.14), text #c97c5d.
- **`.status.ERROR`** / **`.status.UNKNOWN`** / **`.badge--unknown`** – Background rgba(71,73,84,0.12), text #474954.

Template keeps `class="status {{ terminal.latest_status }}"`; no need to add `.badge` unless you want the same look elsewhere.

---

## Table

- **`.table--modern`** – Light row separators, no heavy grid; sticky header optional.
- **`.time-ago`** – Muted “time since” text in table cells.

Use with existing `#terminalsTable` and column `onclick` handlers (e.g. `sortTable`); do not remove them.

---

## Merchant filter panel

- **`.merchant-filter-box`** – Clickable merchant tile (border, hover state).
- **`.merchant-filter-box.selected`** – Selected state (brand primary tint and border).

JS toggles `.selected`; avoid inline background/border on these boxes so the style guide controls appearance.

---

## Styling new components

1. **Use tokens** – Prefer `var(--color-primary)` etc. over hard-coded hex.
2. **Reuse components** – Prefer `.card`, `.panel`, `.btn-primary`, `.input`, etc.
3. **Naming** – Use block__element and block--modifier for new UI.
4. **IDs** – Keep existing IDs and `data-*` / `onclick` hooks; add new classes alongside them.
5. **Load order** – `curbstone-dashboard.css` is loaded after base inline styles so it overrides; keep new overrides in this file.
6. **Accessibility** – Ensure focus states use `--focus-ring` and contrast is sufficient (especially with `--color-light`).

---

## File reference

- **Stylesheet**: `app/static/css/curbstone-dashboard.css`
- **Base layout**: `app/templates/base.html` (topbar, container, footer)
- **Dashboard**: `app/templates/index.html` (filters, date range, KPI cards, merchant section, terminals table)
