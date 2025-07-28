# Design Document

## Overview

This design enhances the Dashboard Agrupadores with multi-select filtering capabilities and budget comparison features. The solution adds a dropdown multi-select filter for agrupadores and optional budget overlay functionality in both current view and period comparison charts. The design maintains the existing architecture while extending the data fetching, state management, and visualization components.

## Architecture

### Component Architecture

The enhancement follows the existing pattern with these key components:

- **Filter Controls**: Multi-select dropdown for agrupadores and checkbox for budget display
- **State Management**: Extended React state to handle filter selections and budget display preferences
- **Data Fetching**: Enhanced API calls to support filtering and budget data aggregation
- **Chart Components**: Modified Recharts components to display budget data alongside expense data
- **API Endpoints**: New endpoints for budget aggregation and enhanced existing endpoints for filtering

### Data Flow

1. **Filter Selection**: User selects agrupadores and budget display options
2. **State Update**: Component state updates trigger data refetch with new parameters
3. **API Calls**: Enhanced API endpoints fetch filtered expense data and aggregated budget data
4. **Data Transformation**: Raw data is transformed for chart consumption with budget overlays
5. **Chart Rendering**: Recharts components render filtered data with optional budget comparisons

## Components and Interfaces

### Enhanced Frontend Components

#### GroupersChartPage Component Extensions

```typescript
// Additional state for filtering and budget display
const [selectedGroupers, setSelectedGroupers] = useState<number[]>([]);
const [showBudgets, setShowBudgets] = useState<boolean>(false);
const [allGroupers, setAllGroupers] = useState<GrouperData[]>([]);

// Enhanced data types
type GrouperDataWithBudget = GrouperData & {
  budget_amount?: number;
};

type PeriodComparisonDataWithBudget = {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
    budget_amount?: number;
  }[];
}[];
```

#### New UI Components

**AgrupadorFilter Component**

```typescript
interface AgrupadorFilterProps {
  allGroupers: GrouperData[];
  selectedGroupers: number[];
  onSelectionChange: (selected: number[]) => void;
  isLoading?: boolean;
}
```

**BudgetToggle Component**

```typescript
interface BudgetToggleProps {
  showBudgets: boolean;
  onToggle: (show: boolean) => void;
  disabled?: boolean;
}
```

### API Enhancements

#### Enhanced Groupers API (`/api/dashboard/groupers`)

**Request Parameters:**

- `periodId`: string (required)
- `paymentMethod`: string (optional)
- `grouperIds`: string (optional, comma-separated list)
- `includeBudgets`: boolean (optional)

**Response Format:**

```typescript
type GrouperResponse = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number; // Only when includeBudgets=true
}[];
```

#### Enhanced Period Comparison API (`/api/dashboard/groupers/period-comparison`)

**Request Parameters:**

- `paymentMethod`: string (optional)
- `grouperIds`: string (optional, comma-separated list)
- `includeBudgets`: boolean (optional)

**Response Format:**

```typescript
type PeriodComparisonResponse = {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
    budget_amount?: number; // Only when includeBudgets=true
  }[];
}[];
```

#### New Budget Aggregation API (`/api/dashboard/groupers/budgets`)

**Request Parameters:**

- `periodId`: string (optional, for single period)
- `grouperIds`: string (optional, comma-separated list)

**Response Format:**

```typescript
type GrouperBudgetResponse = {
  grouper_id: number;
  grouper_name: string;
  period_id?: number;
  period_name?: string;
  total_budget: number;
}[];
```

## Data Models

### Database Queries

#### Budget Aggregation Query

```sql
SELECT
  g.id as grouper_id,
  g.name as grouper_name,
  p.id as period_id,
  p.name as period_name,
  COALESCE(SUM(b.expected_amount), 0) as total_budget
FROM groupers g
CROSS JOIN periods p
LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
LEFT JOIN categories c ON c.id = gc.category_id
LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id
WHERE ($1::int[] IS NULL OR g.id = ANY($1::int[]))
  AND ($2::int IS NULL OR p.id = $2)
GROUP BY g.id, g.name, p.id, p.name
ORDER BY g.name, p.year, p.month;
```

#### Enhanced Grouper Query with Filtering

```sql
SELECT
  g.id as grouper_id,
  g.name as grouper_name,
  COALESCE(SUM(e.amount), 0) as total_amount,
  COALESCE(SUM(b.expected_amount), 0) as budget_amount
FROM groupers g
LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
LEFT JOIN categories c ON c.id = gc.category_id
LEFT JOIN expenses e ON e.category_id = c.id
  AND e.period_id = $1
  AND ($2::text IS NULL OR e.payment_method = $2)
LEFT JOIN budgets b ON b.category_id = c.id
  AND b.period_id = $1
WHERE ($3::int[] IS NULL OR g.id = ANY($3::int[]))
GROUP BY g.id, g.name
ORDER BY g.name;
```

### State Management

#### Filter State Structure

```typescript
interface FilterState {
  selectedGroupers: number[];
  showBudgets: boolean;
  paymentMethod: string;
}

interface GrouperOption {
  grouper_id: number;
  grouper_name: string;
  isSelected: boolean;
}
```

## Error Handling

### API Error Handling

- **Invalid Grouper IDs**: Return 400 with specific error message
- **Database Connection Issues**: Return 500 with retry-friendly error
- **Missing Budget Data**: Return partial data with null budget values
- **Query Timeout**: Return 408 with timeout-specific error message

### Frontend Error Handling

- **Filter Loading Errors**: Show error state in filter dropdown with retry option
- **Budget Data Errors**: Show warning message but continue with expense-only display
- **Chart Rendering Errors**: Fallback to table view with error notification
- **State Synchronization Issues**: Reset filters to default state with user notification

## Testing Strategy

### Unit Tests

#### API Endpoints

- Test budget aggregation with various grouper combinations
- Test filtering with single and multiple grouper selections
- Test error scenarios (invalid IDs, missing data, database errors)
- Test parameter validation and edge cases

#### Frontend Components

- Test filter selection and deselection logic
- Test budget toggle functionality
- Test chart rendering with and without budget data
- Test state synchronization across tab switches

### Integration Tests

#### Data Flow Tests

- Test end-to-end filter application from UI to API to chart rendering
- Test budget display toggle affecting multiple chart types
- Test filter persistence across tab navigation
- Test error recovery and retry mechanisms

#### Performance Tests

- Test query performance with large datasets and multiple filters
- Test chart rendering performance with budget overlays
- Test memory usage with frequent filter changes
- Test API response times with complex aggregations

### User Acceptance Tests

#### Filter Functionality

- Verify multi-select dropdown behavior matches user expectations
- Test "Select All" and "Clear All" functionality
- Verify filter state persistence across browser sessions
- Test accessibility of filter controls

#### Budget Comparison

- Verify budget bars/lines display correctly alongside expense data
- Test tooltip information accuracy for budget vs expense data
- Verify budget data updates correctly when filters change
- Test visual distinction between budget and expense data

## Implementation Notes

### Performance Considerations

- **Query Optimization**: Use proper indexing on grouper_categories table
- **Data Caching**: Implement client-side caching for grouper list and budget data
- **Lazy Loading**: Load budget data only when toggle is enabled
- **Debounced Updates**: Debounce filter changes to prevent excessive API calls

### Accessibility

- **Keyboard Navigation**: Ensure filter dropdown is fully keyboard accessible
- **Screen Reader Support**: Provide proper ARIA labels for filter controls
- **Color Contrast**: Ensure budget vs expense data has sufficient visual distinction
- **Focus Management**: Maintain proper focus flow when filters are applied

### Browser Compatibility

- **Modern Browsers**: Target ES2020+ features with appropriate polyfills
- **Mobile Responsiveness**: Ensure filter controls work on touch devices
- **Chart Rendering**: Test Recharts compatibility across target browsers
- **State Persistence**: Use localStorage with fallback for older browsers
