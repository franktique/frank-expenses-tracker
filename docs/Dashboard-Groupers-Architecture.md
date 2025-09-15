# Dashboard Groupers Architecture Documentation

## Overview

This document explains the architecture and data flow for the Dashboard Groupers feature, specifically focusing on two main views:
1. **Vista Actual** (Current View) - Shows expense and budget totals by groupers for the current period
2. **Gastos por Semana** (Weekly Expenses) - Shows expenses broken down by week with optional budget data

## Architecture Diagram

```mermaid
graph TD
    A[Dashboard Groupers Page] --> B[Tab Selection]
    B --> C{Active Tab}

    C -->|"Vista Actual"| D[fetchGrouperData]
    C -->|"Gastos por Semana"| E[fetchWeeklyExpensesData]

    D --> F["/api/dashboard/groupers"]
    E --> G["/api/dashboard/groupers/weekly-expenses"]

    F --> H[SQL Query - Current Period Groupers]
    G --> I[SQL Query - Weekly Expenses with CTE]

    H --> J[GrouperResult[]]
    I --> K[WeeklyExpensesData]

    J --> L[BarChart - Vista Actual]
    K --> M[transformWeeklyExpensesData]
    M --> N[BarChart - Weekly Expenses]

    O[Filters] --> P[URL Parameters]
    P --> D
    P --> E

    Q[Show Budget Checkbox] --> R[includeBudgets=true]
    R --> D
    R --> E
```

## Vista Actual (Current View)

### Data Flow

#### 1. Request Parameters
The `fetchGrouperData` function constructs a request to `/api/dashboard/groupers` with these parameters:

```typescript
interface RequestParams {
  periodId: string                    // Required - current period ID
  grouperIds?: string                 // Comma-separated grouper IDs (filtered)
  expensePaymentMethods?: string      // Payment methods for expenses
  budgetPaymentMethods?: string       // Payment methods for budgets
  estudioId?: string                  // Study filter (if selected)
  includeBudgets: boolean             // Whether to include budget data
  projectionMode?: boolean            // For projection calculations
}
```

#### 2. API Processing (`/api/dashboard/groupers/route.ts`)

The API builds a dynamic SQL query with these components:

**Base SELECT clause:**
```sql
SELECT
  g.id as grouper_id,
  g.name as grouper_name,
  COALESCE(SUM(e.amount), 0) as total_amount
  -- Budget column added if includeBudgets=true
  [, COALESCE(SUM(b.expected_amount), 0) as budget_amount]
```

**FROM and JOIN clauses:**
```sql
FROM groupers g
LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
LEFT JOIN categories c ON c.id = gc.category_id
LEFT JOIN expenses e ON e.category_id = c.id AND e.period_id = $1
-- Budget join added if includeBudgets=true
[LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = $1]
```

**Filtering:**
- Payment method filtering for both expenses and budgets
- Grouper ID filtering (if specific groupers selected)
- Study filtering (if estudioId provided)

#### 3. Data Structure Returned

```typescript
interface GrouperResult {
  grouper_id: number;
  grouper_name: string;
  total_amount: string;
  budget_amount?: string;  // Only if includeBudgets=true
}
```

#### 4. Chart Rendering

The component renders a `BarChart` using Recharts with:

- **X-axis**: Grouper names
- **Y-axis**: Currency amounts
- **Bars**:
  - Blue bars for expenses (`total_amount`)
  - Green bars for budgets (`budget_amount`) - only when "Mostrar Presupuesto" is checked
- **Tooltip**: Custom tooltip showing formatted currency values
- **Legend**: Shows both expense and budget series when applicable

## Gastos por Semana (Weekly Expenses)

### Data Flow

#### 1. Request Parameters
The `fetchWeeklyExpensesData` function constructs a request to `/api/dashboard/groupers/weekly-expenses` with the same parameter structure as Vista Actual.

#### 2. API Processing (`/api/dashboard/groupers/weekly-expenses/route.ts`)

This endpoint uses a sophisticated SQL query with Common Table Expressions (CTEs):

**CTE Structure:**
```sql
WITH period_info AS (
  -- Get period date boundaries
),
expense_date_range AS (
  -- Calculate actual date range with expenses
),
week_boundaries AS (
  -- Generate week start dates
),
week_ranges AS (
  -- Create week start/end pairs
),
weekly_expenses AS (
  -- Main aggregation query
)
```

**Main aggregation:**
```sql
SELECT
  wr.week_start,
  wr.week_end,
  g.id as grouper_id,
  g.name as grouper_name,
  COALESCE(SUM(e.amount), 0) as weekly_amount
  [, COALESCE(SUM(b.expected_amount), 0) as weekly_budget_amount]
FROM week_ranges wr
CROSS JOIN groupers g
LEFT JOIN expenses e ON e.date >= wr.week_start AND e.date <= wr.week_end
-- Budget join added if includeBudgets=true
```

#### 3. Data Structure Returned

```typescript
interface WeeklyExpensesData {
  week_start: string;
  week_end: string;
  week_label: string;           // "Semana del DD/MM - DD/MM"
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    weekly_amount: number;
    weekly_budget_amount?: number;  // Only if includeBudgets=true
  }[];
}[]
```

#### 4. Data Transformation

The frontend transforms the flat API response into chart-ready data using `transformWeeklyExpensesData`:

```typescript
// Transform from week-based structure to grouper-based structure
// Original: [{ week_label, grouper_data: [...] }, ...]
// Transformed: [{ week_label, [grouper_name]: amount, ... }, ...]
```

#### 5. Chart Rendering

The component renders a `BarChart` with:

- **X-axis**: Week labels (rotated -45 degrees)
- **Y-axis**: Currency amounts
- **Bars**: Dynamic bars for each unique grouper
  - Different colors for each grouper
  - Budget bars (lighter colors) when "Mostrar Presupuesto" is checked
- **Tooltip**: Custom tooltip showing week details and amounts
- **Legend**: Shows all grouper names with their colors

## Key Features

### 1. Filter Integration
Both views respond to the same filter set:
- **Payment Method**: Filters both expenses and budgets
- **Grouper Selection**: Shows only selected groupers
- **Period**: Automatically uses active period
- **Study Filter**: Applies study-specific grouper filtering

### 2. Budget Toggle
When "Mostrar Presupuesto" checkbox is checked:
- API calls include `includeBudgets=true`
- Additional SQL joins fetch budget data
- Charts render budget bars alongside expense bars
- Different visual styling distinguishes budgets from expenses

### 3. Error Handling
Both views implement comprehensive error handling:
- Loading states with skeleton components
- Error boundaries for graceful failure
- Retry mechanisms for failed requests
- Empty state handling when no data available

### 4. Performance Optimizations
- **Conditional queries**: Budget data only fetched when needed
- **Dynamic SQL**: Query complexity adjusts based on parameters
- **Client-side caching**: React state prevents unnecessary refetches
- **Responsive design**: Charts adapt to data volume

## Technical Implementation Details

### Database Schema Relationships
```
groupers
├── grouper_categories (junction table)
│   └── categories
│       ├── expenses (filtered by period_id, payment_method)
│       └── budgets (filtered by period_id, payment_method)
└── estudio_groupers (for study filtering)
```

### State Management
- **React useEffect**: Triggers data fetching on dependency changes
- **State dependencies**: `[activePeriod, paymentMethod, selectedGroupers, showBudgets]`
- **Error states**: Separate error handling for each view
- **Loading states**: Independent loading indicators

### Chart Configuration
- **Recharts library**: Used for all visualizations
- **Responsive containers**: Adapt to different screen sizes
- **Custom tooltips**: Format currency and provide detailed information
- **Color schemes**: Consistent color palette across views
- **Overflow handling**: Horizontal scrolling for large datasets

This architecture provides a robust, scalable solution for dashboard visualization with comprehensive filtering, error handling, and performance optimizations.