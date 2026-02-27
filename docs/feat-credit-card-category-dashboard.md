# Feature Plan: Credit Card – Category Association & Dashboard

**Branch:** `feat/credit-card-category-dashboard`
**Date:** 2026-02-27

---

## Overview

This feature has two closely related goals:

1. **Associate credit cards with categories** — Users can tag a category with a "default credit card", so that when an expense is logged in that category the card is pre-selected. This also becomes the signal used to project what each card will be charged.
2. **Credit Card Spending Dashboard** — A new dashboard menu that, for each active credit card, shows:
   - **Gastos Actuales** – Real expenses charged to that card in the active period.
   - **Proyectado** – Budgeted amount for all categories whose default card is this one.
   - A category-level breakdown of actual vs projected spending per card.

---

## Current State

- `credit_cards` table and full CRUD API already exist (`/api/credit-cards`).
- Expenses already have `credit_card_id` (optional FK), populated at entry time.
- `categories` table does **not** have a credit card column.
- No dashboard exists for credit-card-level analysis.

---

## Implementation Plan

### Phase 1 – Database Migration

- [x] Create migration endpoint `POST /api/migrate-category-credit-card`
  - Adds column: `default_credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL`
  - Adds index: `idx_categories_default_credit_card_id`
  - Supports `DELETE` method for rollback (drops column and index)

---

### Phase 2 – Type Definitions

- [x] Update `Category` interface in `/types/funds.ts`:
  - Add `default_credit_card_id?: string | null`
  - Add `default_credit_card_info?: CreditCardInfo | null` (for joined queries)
- [x] Add API response type `CreditCardDashboardData` in `/types/credit-cards.ts`:
  ```ts
  interface CreditCardDashboardRow {
    credit_card: CreditCard;
    actual_total: number;       // sum of expenses.amount where credit_card_id = card.id
    projected_total: number;    // sum of budgets.expected_amount for categories whose default_credit_card_id = card.id
    categories: {
      category_id: string;
      category_name: string;
      tipo_gasto?: TipoGasto;
      actual: number;
      projected: number;
    }[];
  }
  interface CreditCardDashboardResponse {
    period_id: string;
    period_name: string;
    cards: CreditCardDashboardRow[];
    unassigned: {                // expenses with credit_card_id but card not linked to any category
      actual_total: number;
      categories: { category_id: string; category_name: string; actual: number }[];
    };
  }
  ```

---

### Phase 3 – Backend API Updates

- [x] Update `GET /api/categories` and `GET /api/categories/[id]`:
  - JOIN with `credit_cards` to include `default_credit_card_info` (bank_name, franchise, last_four_digits, is_active)
  - Return `default_credit_card_id` and `default_credit_card_info` fields
- [x] Update `PUT /api/categories/[id]`:
  - Accept optional `default_credit_card_id` (UUID or null)
  - Validate that the credit card exists and is active (or null to unassign)
  - Persist to the new column
- [x] Create new endpoint `GET /api/credit-cards/dashboard`:
  - Query param: `period_id` (required)
  - Returns `CreditCardDashboardResponse`
  - Aggregation logic:
    - **Actual**: `SELECT credit_card_id, category_id, SUM(amount) FROM expenses WHERE period_id = ? GROUP BY credit_card_id, category_id`
    - **Projected**: `SELECT c.default_credit_card_id, b.category_id, SUM(b.expected_amount) FROM budgets b JOIN categories c ON c.id = b.category_id WHERE b.period_id = ? GROUP BY c.default_credit_card_id, b.category_id`
    - Merge both datasets keyed by card

---

### Phase 4 – Category UI: Default Credit Card Selector

- [x] Update `/components/categories-view.tsx` (or the category edit dialog):
  - Add a `CreditCardSelector` field labeled "Tarjeta por Defecto"
  - Fetch active credit cards on mount (reuse existing `CreditCardSelector` component)
  - On save, send `default_credit_card_id` to `PUT /api/categories/[id]`
- [x] Show a small credit card badge/icon on category list rows when a default card is assigned
  - Display: franchise icon + last 4 digits (e.g., "Visa ···4321")

---

### Phase 5 – Credit Card Dashboard Page

- [x] Create page at `/app/dashboard/credit-cards/page.tsx`
  - Client component
  - Reads active period from `BudgetContext`
  - Fetches data from `GET /api/credit-cards/dashboard?period_id={id}` on mount and period change
- [x] Page layout:
  - **Header**: Title "Dashboard Tarjetas de Crédito" + period name
  - **Summary KPI cards** (one per active card): Card name | Gastado | Proyectado | Diferencia
  - **Per-card accordion/section**: Expandable, shows category-level table:
    - Columns: Categoría | Tipo Gasto | Proyectado | Gastado | Diferencia | %
    - Totals row per card
  - **Sin Tarjeta section**: Expenses with `credit_card_id IS NULL` in the period
- [x] Add a bar chart (Recharts) per card: Projected vs Actual stacked or grouped bars by category

---

### Phase 6 – Sidebar Navigation

- [x] Update `/components/app-sidebar.tsx`:
  - Add sub-menu under "Tarjetas de Crédito" (or under "Dashboards") for:
    - **Gestión** → `/tarjetas-credito` (existing)
    - **Dashboard** → `/dashboard/credit-cards` (new)
  - Use `BarChart3` or `CreditCard` icon for the new item

---

## File Checklist

| File | Action |
|------|--------|
| `app/api/migrate-category-credit-card/route.ts` | Create |
| `types/funds.ts` | Update `Category` interface |
| `types/credit-cards.ts` | Add dashboard response types |
| `app/api/categories/route.ts` | Update GET to include credit card join |
| `app/api/categories/[id]/route.ts` | Update GET + PUT for credit card field |
| `app/api/credit-cards/dashboard/route.ts` | Create |
| `components/categories-view.tsx` | Add credit card selector to edit form |
| `app/dashboard/credit-cards/page.tsx` | Create (new dashboard page) |
| `components/credit-card-dashboard-view.tsx` | Create (main dashboard component) |
| `components/app-sidebar.tsx` | Add sub-menu item |

---

## Technical Notes

- The `CreditCardSelector` component already exists at `/components/credit-card-selector.tsx` — reuse it in the category form.
- Use the `useCreditCardSelection()` hook for managing selection state.
- The dashboard does **not** require any new database tables; it queries existing `expenses`, `budgets`, and `categories` tables with the new `default_credit_card_id` column.
- All monetary values use `es-MX` locale formatting (consistent with rest of app).
- Loading states and empty states must be handled (no cards, no period selected, etc.).
- The migration endpoint follows the existing pattern: `POST` to apply, `DELETE` to rollback.

---

## Out of Scope (Future Enhancements)

- Syncing credit card statements / bank imports
- Payment due dates and minimum payments
- Credit limit tracking / utilization ratio
- Multi-period historical trends per card

