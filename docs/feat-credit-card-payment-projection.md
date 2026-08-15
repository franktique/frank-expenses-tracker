# Feature Plan: Credit Card – Payment Projection (Proyección de Pago)

**Branch:** `Feature/project-based-fecha-corte`
**Date:** 2026-08-12

---

## Overview

Project the credit-card **payment for next month's budget** from expenses already recorded in the app, driven by each card's **Fecha de Corte** (statement closing day).

- The statement cycle window is `(corte of month M-1, corte of month M]`, where M is the active period's month: a charge recorded after last month's corte and on or before this month's corte belongs to this statement.
- The payment for that statement falls in **month M+1** — i.e., next month's budget.
- **Read-only**: the feature only displays the projected amount per card; it never writes budgets, periods, or any other data.
- Placement: a "Proyección de pago" section on `/tarjetas-credito`, one line per card.

Confirmed decisions (user Q&A): placement on the credit-cards page, read-only, one line per card, all charges in the cycle included.

---

## Current State

- `credit_cards` table exists (`id, bank_name, franchise, last_four_digits, is_active, created_at, updated_at`) with full CRUD API — but has **no corte / cutoff field**.
- Expenses carry `credit_card_id` (optional FK), `payment_method` (`'credit'`), `date`, `amount`, `pending` — enough to sum a statement window.
- No date-range query path exists anywhere (expenses are queried by `period_id` / `credit_card_id` only).
- `periods.month` is **0-indexed** (0 = January); no next-month helper exists in the codebase.

---

## Implementation Plan

### Phase 1 – Database Migration

- [x] `scripts/create-credit-card-cutoff-day-migration.sql` + rollback:
  - `ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS cutoff_day INTEGER`
  - `ADD CONSTRAINT check_valid_cutoff_day CHECK (cutoff_day IS NULL OR (cutoff_day >= 1 AND cutoff_day <= 31))`
- [x] Migration endpoint `POST /api/migrate-credit-card-cutoff-day` (GET status / POST apply / DELETE rollback, idempotent, mirrors `/api/migrate-credit-cards`).
- No index needed — projection queries filter by the already-indexed `expenses.credit_card_id`.

### Phase 2 – Types (`types/credit-cards.ts`)

- [x] `cutoff_day: number | null` on `CreditCard` interface + `CreditCardSchema` (`int`, 1–31, nullable).
- [x] `cutoff_day` nullable-optional on `CreateCreditCardSchema` / `UpdateCreditCardSchema` (nullable so edit can clear it).
- [x] New `CreditCardProjectionRow` / `CreditCardProjectionResponse` types + `CUTOFF_DAY_RANGE` error message.

### Phase 3 – CRUD Wiring

- [x] `GET/POST /api/credit-cards`: include `cutoff_day` in column lists, INSERT and RETURNING.
- [x] `PUT /api/credit-cards/[id]`: dynamic SET-clause pattern (COALESCE cannot clear a value to NULL); status-only branch untouched.
- [x] `GET /api/credit-cards/dashboard`: `cutoff_day` added to `CardRow` for type compatibility.

### Phase 4 – Pure Lib (`lib/credit-card-projection-utils.ts`)

- [x] `getCutoffDate(year, month /*0-indexed*/, cutoffDay)` — clamped `YYYY-MM-DD` (31 in Feb → 28/29), built from local components (never `toISOString()`, which shifts dates under TZ America/Bogota).
- [x] `getProjectionWindow(periodYear, periodMonth, cutoffDay)` — `{ windowStart (M-1 corte, exclusive), windowEnd (M corte, inclusive), nextPaymentYear/Month (M+1) }` with December→January rollovers on both ends.
- [x] `getSpanishMonthName(month)` / `parseDateString('YYYY-MM-DD')` for TZ-safe UI display.
- [x] Jest tests (`lib/__tests__/credit-card-projection-utils.test.ts`, 26 cases): clamping, leap years, rollovers, window bounds, invalid inputs.

### Phase 5 – API Endpoint (`GET /api/credit-cards/projection`)

- [x] Optional `?period_id=`, defaults to the active (`is_open`) period; 404 for missing period / no active period.
- [x] Per active card **with** `cutoff_day`: sum expenses where `credit_card_id = card AND payment_method = 'credit' AND date > windowStart AND date <= windowEnd AND (pending IS NULL OR pending = false)`.
- [x] Cards **without** `cutoff_day` returned with `has_cutoff_day: false` so the UI can prompt.
- [x] Response: `CreditCardProjectionResponse` (`cards[]`, `total_projected`). Read-only — SELECTs only.

### Phase 6 – UI (`components/credit-cards-view.tsx`)

- [x] "Día de Corte" number input (1–31) in both create and edit dialogs; clearing sends `null`; edit pre-fills.
- [x] "Proyección de pago" card section below the cards table:
  - Per card: name, projected amount, cycle dates ("Ciclo: 16 de julio al 15 de agosto de 2026"), "Este pago corresponde al presupuesto de {mes} {año}." and expense count.
  - Cards without a corte day show a prompt to edit and configure it.
  - Empty cycle → "$0 – No hay gastos registrados en este ciclo de corte."; total projected shown at the bottom.
  - Fetches via `useBudget().activePeriod` (same pattern as the credit-card dashboard); refreshes after any card mutation.

### Phase 7 – Docs

- [x] This document.

---

## Edge Cases

- Existing cards have `cutoff_day` NULL → UI prompts to configure it; endpoint returns `has_cutoff_day: false`.
- Day clamping: 31 in Feb/Apr/Jun/Sep/Nov → last valid day; leap-year Feb 29.
- December → January rollover on both the window start and the next payment month (year changes on both ends).
- No active period / nonexistent `period_id` → 404 (UI never calls without an active period).
- Pending expenses excluded (`pending IS NULL OR pending = false`), consistent with every app aggregate.
- Inactive cards excluded (`is_active = true`), consistent with the card dashboard.
- `windowStart < windowEnd` always (exactly one month apart), so no inverted-window state.

## Out of Scope

- Writing projected payments into next month's budget (user chose read-only).
- Minimum payment / interest calculations, statement imports, due-date reminders.

---

## API Contract

`GET /api/credit-cards/projection?period_id={id}` (period_id optional — defaults to the active period)

```json
{
  "period_id": "…",
  "period_name": "Agosto 2026",
  "cards": [
    {
      "credit_card": { "id": "…", "bank_name": "…", "franchise": "visa", "last_four_digits": "1234", "is_active": true, "cutoff_day": 15 },
      "has_cutoff_day": true,
      "window_start": "2026-07-16",
      "window_end": "2026-08-15",
      "next_payment_month": 8,
      "next_payment_year": 2026,
      "projected_amount": 1250000,
      "expense_count": 9
    },
    {
      "credit_card": { "…": "…" },
      "has_cutoff_day": false,
      "window_start": null,
      "window_end": null,
      "next_payment_month": null,
      "next_payment_year": null,
      "projected_amount": 0,
      "expense_count": 0
    }
  ],
  "total_projected": 1250000
}
```

Note: `window_start` is exclusive, `window_end` inclusive. `next_payment_month` is 0-indexed.
