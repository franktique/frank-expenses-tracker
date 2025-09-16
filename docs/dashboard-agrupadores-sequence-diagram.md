# Dashboard Agrupadores - Sequence Diagram

This document shows the complete data flow from frontend to backend for the Dashboard Agrupadores views: **Vista Actual** and **Acumulado Semanal**.

## Vista Actual (Current View) - Sequence Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Dashboard Agrupadores Page
    participant FilterAPI as /api/dashboard/groupers
    participant CategoryAPI as /api/dashboard/groupers/[id]/categories
    participant IncomeAPI as /api/periods/[id]/income
    participant EstudioAPI as /api/estudios/[id]/groupers
    participant DB as Database

    Note over User,DB: Initial Page Load - Vista Actual

    User->>Frontend: Open Dashboard Agrupadores page
    Frontend->>Frontend: Load active period from context
    Frontend->>Frontend: Load payment method filters from session storage

    %% Initial data loading
    Frontend->>FilterAPI: GET /api/dashboard/groupers
    Note right of FilterAPI: Parameters:<br/>- periodId: string<br/>- paymentMethod: "all" (default)<br/>- estudioId?: number (if selected)
    FilterAPI->>DB: Query groupers with expense totals
    DB-->>FilterAPI: Returns grouper data
    FilterAPI-->>Frontend: Response: GrouperResult[]
    Note left of FilterAPI: Response:<br/>[{<br/>  grouper_id: number,<br/>  grouper_name: string,<br/>  total_amount: string,<br/>  budget_amount?: string<br/>}]

    %% Income data for projection mode
    opt If projection mode enabled
        Frontend->>IncomeAPI: GET /api/periods/[id]/income
        Note right of IncomeAPI: Parameters:<br/>- periodId: string (from URL path)
        IncomeAPI->>DB: Query period income totals
        DB-->>IncomeAPI: Returns income data
        IncomeAPI-->>Frontend: Response: { total_income: number }
    end

    %% Estudio grouper percentages
    opt If estudio selected
        Frontend->>EstudioAPI: GET /api/estudios/[id]/groupers
        Note right of EstudioAPI: Parameters:<br/>- estudioId: number (from URL path)
        EstudioAPI->>DB: Query estudio grouper relationships with percentages
        DB-->>EstudioAPI: Returns estudio grouper data
        EstudioAPI-->>Frontend: Response: EstudioGrouperData[]
        Note left of EstudioAPI: Response:<br/>[{<br/>  grouper_id: number,<br/>  percentage: number,<br/>  payment_methods: string[]<br/>}]
    end

    %% User interaction - category drill-down
    User->>Frontend: Click on grouper to view categories
    Frontend->>CategoryAPI: GET /api/dashboard/groupers/[id]/categories
    Note right of CategoryAPI: Parameters:<br/>- periodId: string<br/>- expensePaymentMethods?: string[] (comma-separated)<br/>- budgetPaymentMethods?: string[] (comma-separated)<br/>- includeBudgets: boolean<br/>- projectionMode?: boolean
    CategoryAPI->>DB: Query categories for specific grouper with expenses/budgets
    DB-->>CategoryAPI: Returns category breakdown
    CategoryAPI-->>Frontend: Response: CategoryData[]
    Note left of CategoryAPI: Response:<br/>[{<br/>  category_id: number,<br/>  category_name: string,<br/>  total_amount: string,<br/>  budget_amount?: string<br/>}]

    %% Filter changes
    User->>Frontend: Change payment method filter
    Frontend->>Frontend: Update selectedPaymentMethods state
    Frontend->>FilterAPI: GET /api/dashboard/groupers (with updated filters)
    Note right of FilterAPI: Parameters:<br/>- periodId: string<br/>- expensePaymentMethods: string[] (updated)<br/>- budgetPaymentMethods?: string[]<br/>- grouperIds?: string[] (comma-separated)<br/>- includeBudgets: boolean<br/>- projectionMode?: boolean
    FilterAPI->>DB: Re-query with payment method filters
    DB-->>FilterAPI: Returns filtered grouper data
    FilterAPI-->>Frontend: Updated GrouperResult[]

    %% Projection mode toggle
    opt User enables projection mode
        User->>Frontend: Toggle "Simulate" checkbox
        Frontend->>Frontend: Set projectionMode = true, includeBudgets = true
        Frontend->>FilterAPI: GET /api/dashboard/groupers (with projection params)
        Note right of FilterAPI: Parameters include:<br/>- projectionMode: true<br/>- includeBudgets: true
        FilterAPI->>DB: Query with budget data and projection logic
        DB-->>FilterAPI: Returns data with budget_amount
        FilterAPI-->>Frontend: GrouperResult[] with projection data

        opt If category chart is shown
            Frontend->>CategoryAPI: GET /api/dashboard/groupers/[id]/categories (with projection)
            Note right of CategoryAPI: Parameters include:<br/>- projectionMode: true<br/>- includeBudgets: true
            CategoryAPI->>DB: Query categories with budget projection
            DB-->>CategoryAPI: Returns category data with budgets
            CategoryAPI-->>Frontend: CategoryData[] with projection
        end
    end
```

## Acumulado Semanal (Weekly Cumulative) - Sequence Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Dashboard Agrupadores Page
    participant WeeklyCumulativeAPI as /api/dashboard/groupers/weekly-cumulative
    participant WeeklyExpensesAPI as /api/dashboard/groupers/weekly-expenses
    participant WeeklyCategoriesAPI as /api/dashboard/groupers/weekly-categories
    participant DB as Database

    Note over User,DB: Acumulado Semanal Tab Selection

    User->>Frontend: Click "Acumulado Semanal" tab
    Frontend->>Frontend: Set activeTab = "weekly-cumulative"
    Frontend->>Frontend: Clear existing data states

    %% Weekly cumulative data
    Frontend->>WeeklyCumulativeAPI: GET /api/dashboard/groupers/weekly-cumulative
    Note right of WeeklyCumulativeAPI: Parameters:<br/>- periodId: string<br/>- expensePaymentMethods?: string[]<br/>- budgetPaymentMethods?: string[]<br/>- grouperIds?: string[] (comma-separated)<br/>- estudioId?: number<br/>- includeBudgets: boolean
    WeeklyCumulativeAPI->>DB: Complex query with CTEs for weekly cumulative calculation
    Note right of DB: Query components:<br/>- period_info CTE: Gets period boundaries<br/>- expense_date_range CTE: Gets actual expense date range<br/>- week_boundaries CTE: Generates Sunday-Saturday weeks<br/>- week_ranges CTE: Creates week start/end pairs<br/>- weekly_expenses CTE: Calculates weekly amounts<br/>- Final SELECT: Cumulative sums with window functions
    DB-->>WeeklyCumulativeAPI: Returns weekly cumulative data
    WeeklyCumulativeAPI-->>Frontend: Response: WeeklyCumulativeData[]
    Note left of WeeklyCumulativeAPI: Response:<br/>[{<br/>  week_start: string,<br/>  week_end: string,<br/>  week_label: string,<br/>  grouper_data: [{<br/>    grouper_id: number,<br/>    grouper_name: string,<br/>    cumulative_amount: number,<br/>    cumulative_budget_amount?: number<br/>  }]<br/>}]

    %% Weekly expenses data (for bar chart)
    Frontend->>WeeklyExpensesAPI: GET /api/dashboard/groupers/weekly-expenses
    Note right of WeeklyExpensesAPI: Parameters:<br/>- periodId: string<br/>- expensePaymentMethods?: string[]<br/>- grouperIds?: string[]<br/>- estudioId?: number<br/>- includeBudgets: boolean
    WeeklyExpensesAPI->>DB: Query weekly expense amounts (non-cumulative)
    DB-->>WeeklyExpensesAPI: Returns weekly expense data
    WeeklyExpensesAPI-->>Frontend: Response: WeeklyExpensesData[]
    Note left of WeeklyExpensesAPI: Response:<br/>[{<br/>  week_start: string,<br/>  week_end: string,<br/>  week_label: string,<br/>  grouper_data: [{<br/>    grouper_id: number,<br/>    grouper_name: string,<br/>    weekly_amount: number,<br/>    budget_amount?: number<br/>  }]<br/>}]

    %% Weekly categories data (for category breakdown)
    Frontend->>WeeklyCategoriesAPI: GET /api/dashboard/groupers/weekly-categories
    Note right of WeeklyCategoriesAPI: Parameters:<br/>- periodId: string<br/>- expensePaymentMethods?: string[]<br/>- grouperIds?: string[]<br/>- estudioId?: number
    WeeklyCategoriesAPI->>DB: Query weekly category breakdown
    DB-->>WeeklyCategoriesAPI: Returns weekly category data
    WeeklyCategoriesAPI-->>Frontend: Response: WeeklyCategoryData[]
    Note left of WeeklyCategoriesAPI: Response:<br/>[{<br/>  week_start: string,<br/>  week_end: string,<br/>  week_label: string,<br/>  category_data: [{<br/>    category_id: number,<br/>    category_name: string,<br/>    grouper_id: number,<br/>    grouper_name: string,<br/>    weekly_amount: number<br/>  }]<br/>}]

    %% User interactions - filtering
    User->>Frontend: Change grouper selection
    Frontend->>Frontend: Update selectedGroupers state
    loop For each API endpoint
        Frontend->>WeeklyCumulativeAPI: Re-fetch with updated grouperIds parameter
        Frontend->>WeeklyExpensesAPI: Re-fetch with updated grouperIds parameter
        Frontend->>WeeklyCategoriesAPI: Re-fetch with updated grouperIds parameter
    end

    User->>Frontend: Change payment method filter
    Frontend->>Frontend: Update payment method states
    loop For each API endpoint
        Frontend->>WeeklyCumulativeAPI: Re-fetch with updated expensePaymentMethods
        Frontend->>WeeklyExpensesAPI: Re-fetch with updated expensePaymentMethods
        Frontend->>WeeklyCategoriesAPI: Re-fetch with updated expensePaymentMethods
    end

    %% Budget toggle
    User->>Frontend: Toggle "Mostrar presupuestos" checkbox
    Frontend->>Frontend: Set showBudgets = !showBudgets
    Frontend->>WeeklyCumulativeAPI: Re-fetch with includeBudgets parameter
    Note right of WeeklyCumulativeAPI: If includeBudgets=true, includes:<br/>- cumulative_budget_amount in response<br/>- Budget payment method filtering<br/>- LEFT JOIN budgets table
    Frontend->>WeeklyExpensesAPI: Re-fetch with includeBudgets parameter
    Note right of WeeklyExpensesAPI: If includeBudgets=true, includes:<br/>- budget_amount (weekly, not cumulative)<br/>- Budget payment method filtering
```

## Key Data Structures

### GrouperResult (Vista Actual)
```typescript
interface GrouperResult {
  grouper_id: number;
  grouper_name: string;
  total_amount: string;    // Total expenses for the period
  budget_amount?: string;  // Total budgets (only if includeBudgets=true)
}
```

### CategoryData (Category Drill-down)
```typescript
interface CategoryData {
  category_id: number;
  category_name: string;
  total_amount: string;    // Total expenses for the category
  budget_amount?: string;  // Total budgets (only if includeBudgets=true)
}
```

### WeeklyCumulativeData (Acumulado Semanal)
```typescript
interface WeeklyCumulativeData {
  week_start: string;      // YYYY-MM-DD format
  week_end: string;        // YYYY-MM-DD format
  week_label: string;      // "Semana del DD/MM - DD/MM"
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    cumulative_amount: number;         // Running total up to this week
    cumulative_budget_amount?: number; // Running budget total (if includeBudgets=true)
  }[];
}
```

### WeeklyExpensesData (Weekly Bar Chart)
```typescript
interface WeeklyExpensesData {
  week_start: string;
  week_end: string;
  week_label: string;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    weekly_amount: number;    // Expenses for this specific week only
    budget_amount?: number;   // Budget for this specific week only
  }[];
}
```

## API Parameter Summary

### Common Parameters
- `periodId`: Current active period ID (required)
- `expensePaymentMethods`: Comma-separated payment methods for expense filtering ("cash", "credit", "debit")
- `budgetPaymentMethods`: Comma-separated payment methods for budget filtering
- `grouperIds`: Comma-separated grouper IDs for filtering specific groupers
- `estudioId`: Study/Estudio ID for contextual filtering
- `includeBudgets`: Boolean flag to include budget data in response
- `projectionMode`: Boolean flag for projection/simulation mode (Vista Actual only)

### Database Query Patterns

#### Vista Actual Queries
- Main grouper query uses JOINs across: `groupers` → `grouper_categories` → `categories` → `expenses`
- Budget data added via LEFT JOIN to `budgets` table
- Payment method filtering applied to both expenses and budgets
- Estudio filtering uses INNER JOIN to `estudio_groupers` with payment method configuration

#### Acumulado Semanal Queries
- Uses Common Table Expressions (CTEs) for complex week boundary calculations
- Week boundaries calculated as Sunday-to-Saturday ranges
- Cumulative calculations use window functions with `ROWS UNBOUNDED PRECEDING`
- Three separate endpoints provide different data views of the same weekly structure

## Error Handling

### Projection Mode Errors
- Frontend includes error recovery mechanisms for budget data issues
- Backend returns structured error responses with `projectionError: true` flag
- Fallback suggestions provided when budget data is insufficient

### Payment Method Validation
- All payment method parameters validated against allowed values: ["cash", "credit", "debit"]
- Invalid payment methods return 400 status with descriptive error messages

### Database Connection Handling
- Timeout and connection errors specifically handled with user-friendly messages
- Syntax errors in dynamic queries caught and reported appropriately