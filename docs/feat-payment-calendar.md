# Payment Calendar Feature Plan

**Branch:** `feat/payment-calendar`
**Date:** 2026-03-04

## Overview

Create a **Payment Calendar** dashboard that shows, for each day of the active period, the total amounts scheduled for payment — broken down by **Efectivo/Débito** (cash/debit) and **Crédito** (credit card). Each day's totals are derived from the `default_date` field set on each budget entry, which is the same "día por defecto" visible in the main dashboard table.

---

## User Story

> As a user, I want to see a calendar view that shows me how much I need to pay on each specific day of the period, separated by payment method (efectivo vs crédito), so I can plan my cash flow day by day.

---

## Feature Details

### Calendar View
- A monthly calendar grid showing the active period
- Each day cell shows:
  - **Total Efectivo/Débito** (green label)
  - **Total Crédito** (blue/purple label)
  - If both are zero → no amounts shown (clean cell)
- Hovering / clicking a day opens a detail panel listing all budgets scheduled for that date
- Days without budgets remain visually empty (minimal clutter)

### Detail Panel (on day click)
- List of budget entries for the selected day:
  - Category name
  - Amount
  - Payment method badge (Efectivo / Crédito)
- Subtotals per payment method for that day

### Recurrence Support
- Budgets with `recurrence_frequency = 'weekly'` or `'bi-weekly'` are expanded across all their scheduled dates within the period (reusing existing `expandBudgetPayments` logic from `/lib/budget-recurrence-utils.ts`)
- Single-occurrence budgets use their `default_date` directly (or day 1 of the period if none set)

### Filters
- Period selector (uses active period from BudgetContext; no change needed)
- Payment method filter toggle: All / Efectivo / Crédito

---

## File Structure

```
app/
  dashboard/
    payment-calendar/
      page.tsx                     ← Main calendar page

app/api/
  payment-calendar/
    [periodId]/
      route.ts                     ← API endpoint returning daily breakdown

components/
  payment-calendar/
    payment-calendar-grid.tsx      ← Calendar grid component
    payment-calendar-day-cell.tsx  ← Individual day cell
    payment-calendar-detail.tsx    ← Detail panel for selected day

lib/
  payment-calendar-utils.ts        ← Helper functions (data formatting, aggregation)

types/
  (extend funds.ts)                ← Add PaymentCalendarDay, PaymentCalendarResponse types
```

---

## Data Flow

```
BudgetContext (activePeriod)
      ↓
page.tsx fetches → /api/payment-calendar/[periodId]
      ↓
API reads budgets + categories for period
      ↓
Expands recurring budgets via expandBudgetPayments()
      ↓
Aggregates by date → { date, cashTotal, creditTotal, budgets[] }
      ↓
Returns PaymentCalendarResponse
      ↓
page.tsx renders PaymentCalendarGrid
```

---

## API Design

### `GET /api/payment-calendar/[periodId]`

**Response:**
```typescript
interface PaymentCalendarResponse {
  periodId: string;
  periodName: string;
  month: number;       // 1-12
  year: number;
  days: PaymentCalendarDay[];
}

interface PaymentCalendarDay {
  date: string;        // YYYY-MM-DD
  cashTotal: number;   // sum of cash + debit payment_method budgets
  creditTotal: number; // sum of credit payment_method budgets
  budgets: PaymentCalendarBudgetEntry[];
}

interface PaymentCalendarBudgetEntry {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  paymentMethod: 'cash' | 'credit' | 'debit';
}
```

**Logic:**
1. Fetch all budgets for `periodId` (JOIN categories)
2. Fetch period details (month, year, start date)
3. For each budget:
   - If `recurrence_frequency` is set → expand via `expandBudgetPayments()` to get all dates in period
   - Else → use `default_date` or period day-1 as the single date
4. Group expanded payments by date
5. Aggregate `cashTotal` (cash + debit) and `creditTotal` (credit) per date
6. Return full `PaymentCalendarResponse`

---

## UI Components

### `PaymentCalendarGrid`
- Renders a 7-column grid (Mon–Sun or Sun–Sat) for the period month
- Uses `date-fns` for calendar math (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay`)
- Empty days (before/after month) shown as dimmed cells

### `PaymentCalendarDayCell`
- Props: `date`, `cashTotal`, `creditTotal`, `isSelected`, `onClick`
- Shows day number in corner
- Shows cash total with green badge (if > 0)
- Shows credit total with blue badge (if > 0)
- Highlights today's date with ring border
- Selected date gets accent background

### `PaymentCalendarDetail`
- Slide-in panel or card below calendar
- Shows list of budgets for selected date
- Subtotals per payment method
- Close/dismiss button

---

## Sidebar Navigation

Add to `/components/app-sidebar.tsx` after "Ejecución Proyectada":

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    isActive={isActive('/dashboard/payment-calendar')}
    tooltip="Calendario de Pagos"
  >
    <Link href="/dashboard/payment-calendar">
      <CalendarRange className="h-4 w-4" />
      <span>Calendario de Pagos</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

Note: `CalendarRange` icon is already imported in the sidebar.

---

## Implementation Tasks

### Todo

- [x] **1. Create type definitions** in `/types/funds.ts`
  - Add `PaymentCalendarDay`, `PaymentCalendarBudgetEntry`, `PaymentCalendarResponse` interfaces

- [x] **2. Create API endpoint** `/app/api/payment-calendar/[periodId]/route.ts`
  - Fetch budgets with category join for period
  - Expand recurring budgets using `expandBudgetPayments`
  - Aggregate by date into daily cash/credit totals
  - Return `PaymentCalendarResponse`

- [x] **3. Create utility helpers** `/lib/payment-calendar-utils.ts`
  - `buildCalendarGrid(month, year, days)` → 2D array of weeks for rendering
  - `formatCalendarDate(date)` → display string
  - `getDayTotals(day, filter)` → filtered totals per day

- [x] **4. Create `PaymentCalendarDayCell` component** `/components/payment-calendar/payment-calendar-day-cell.tsx`
  - Day number, cash badge, credit badge
  - Selected/today highlighting

- [x] **5. Create `PaymentCalendarDetail` component** `/components/payment-calendar/payment-calendar-detail.tsx`
  - Detail list for selected day
  - Subtotals by payment method

- [x] **6. Create `PaymentCalendarGrid` component** `/components/payment-calendar/payment-calendar-grid.tsx`
  - Calendar grid layout
  - Renders day cells
  - Handles date selection state

- [x] **7. Create main page** `/app/dashboard/payment-calendar/page.tsx`
  - Fetches data from API
  - Renders header with period name + filter toggle
  - Renders `PaymentCalendarGrid`
  - Renders `PaymentCalendarDetail` when day is selected
  - Loading/error/empty states

- [x] **8. Add sidebar navigation** in `/components/app-sidebar.tsx`
  - Add menu item for "Calendario de Pagos" under dashboard section
  - Uses existing `isActive` default check for exact route match

---

## Visual Design Reference

```
┌─────────────────────────────────────────────┐
│  Calendario de Pagos   Marzo 2026           │
│  [Todos ▼]  [Efectivo] [Crédito]           │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ Lun  │ Mar  │ Mié  │ Jue  │ Vie  │ Sáb  │ Dom  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │      │      │      │      │  1   │  2   │
│      │      │      │      │      │ $500 │      │
│      │      │      │      │      │ 💳300│      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  3   │  4   │  5   │  6   │  7   │  8   │  9   │
│$1200 │      │$2500 │      │      │      │      │
│💳800 │      │💳150 │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘

Selected: Miércoles 5 de Marzo
─────────────────────────────
  Renta                 $2,000   Efectivo
  Seguro Carro            $500   Efectivo
  Netflix                 $150   Crédito
─────────────────────────────
  Total Efectivo        $2,500
  Total Crédito           $150
```

---

## Notes

- **Efectivo** label groups `cash` AND `debit` payment methods (matches dashboard behavior)
- **Crédito** label maps to `credit` payment method only
- Budgets without `default_date` default to day 1 of the period (same as Ejecución Proyectada)
- Recurrence expansion uses existing `expandBudgetPayments` from `/lib/budget-recurrence-utils.ts`
- No new database migration required — reads from existing `budgets` + `categories` tables
- Uses `CalendarRange` lucide icon (already imported in sidebar)
