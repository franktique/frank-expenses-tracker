# Design Document

## Overview

This feature extends the existing Dashboard Agrupadores with two new chart visualizations: a period comparison chart and a weekly cumulative chart. The design builds upon the current architecture by adding new API endpoints for data aggregation and implementing a tabbed interface to switch between different chart views while maintaining the existing functionality.

## Architecture

The solution follows the existing Next.js architecture pattern:

- **Frontend**: React components with tab-based navigation using existing UI components
- **API Layer**: New Next.js API routes for period comparison and weekly cumulative data
- **Database**: PostgreSQL queries aggregating expense data across different time dimensions
- **Charts**: Recharts library for consistent visualization styling

### Component Structure

```
app/dashboard/groupers/page.tsx (enhanced)
├── Tab Navigation (new)
│   ├── Vista Actual (existing chart)
│   ├── Comparación por Períodos (new)
│   └── Acumulado Semanal (new)
├── Shared Filters (payment method, period selection)
└── Chart Components
    ├── CurrentGrouperChart (existing)
    ├── PeriodComparisonChart (new)
    └── WeeklyCumulativeChart (new)
```

## Components and Interfaces

### New API Endpoints

#### `/api/dashboard/groupers/period-comparison`

**Purpose**: Fetch agrupador totals across all periods for comparison chart

**Query Parameters**:

- `paymentMethod`: string (optional, defaults to "all")

**Response Format**:

```typescript
type PeriodComparisonData = {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
  }[];
}[];
```

**SQL Query Structure**:

```sql
SELECT
  p.id as period_id,
  p.name as period_name,
  p.month as period_month,
  p.year as period_year,
  g.id as grouper_id,
  g.name as grouper_name,
  COALESCE(SUM(e.amount), 0) as total_amount
FROM periods p
CROSS JOIN groupers g
LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
LEFT JOIN categories c ON c.id = gc.category_id
LEFT JOIN expenses e ON e.category_id = c.id
  AND e.period_id = p.id
  [AND e.payment_method = $1 if payment method filter applied]
GROUP BY p.id, p.name, p.month, p.year, g.id, g.name
ORDER BY p.year, p.month, g.name
```

#### `/api/dashboard/groupers/weekly-cumulative`

**Purpose**: Fetch weekly cumulative data for agrupadores with Sunday week boundaries

**Query Parameters**:

- `periodId`: number (required)
- `paymentMethod`: string (optional, defaults to "all")

**Response Format**:

```typescript
type WeeklyCumulativeData = {
  week_start: string; // ISO date string (Sunday)
  week_end: string; // ISO date string (Saturday or current day)
  week_label: string; // "Semana del DD/MM - DD/MM"
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    cumulative_amount: number;
  }[];
}[];
```

**SQL Query Structure**:

```sql
WITH week_boundaries AS (
  SELECT
    date_trunc('week', generate_series(
      date_trunc('month', make_date(p.year, p.month + 1, 1)),
      LEAST(
        date_trunc('month', make_date(p.year, p.month + 1, 1)) + interval '1 month' - interval '1 day',
        CURRENT_DATE
      ),
      '1 week'::interval
    )) as week_start
  FROM periods p WHERE p.id = $1
),
weekly_expenses AS (
  SELECT
    wb.week_start,
    wb.week_start + interval '6 days' as week_end,
    g.id as grouper_id,
    g.name as grouper_name,
    COALESCE(SUM(e.amount), 0) as weekly_amount
  FROM week_boundaries wb
  CROSS JOIN groupers g
  LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
  LEFT JOIN categories c ON c.id = gc.category_id
  LEFT JOIN expenses e ON e.category_id = c.id
    AND e.period_id = $1
    AND e.date >= wb.week_start
    AND e.date <= LEAST(wb.week_start + interval '6 days', CURRENT_DATE)
    [AND e.payment_method = $2 if payment method filter applied]
  GROUP BY wb.week_start, g.id, g.name
)
SELECT
  week_start,
  week_end,
  grouper_id,
  grouper_name,
  SUM(weekly_amount) OVER (
    PARTITION BY grouper_id
    ORDER BY week_start
    ROWS UNBOUNDED PRECEDING
  ) as cumulative_amount
FROM weekly_expenses
ORDER BY week_start, grouper_name
```

### Frontend Components

#### Enhanced GroupersChartPage

**New State Variables**:

```typescript
const [activeTab, setActiveTab] = useState<
  "current" | "period-comparison" | "weekly-cumulative"
>("current");
const [periodComparisonData, setPeriodComparisonData] =
  useState<PeriodComparisonData>([]);
const [weeklyCumulativeData, setWeeklyCumulativeData] =
  useState<WeeklyCumulativeData>([]);
const [isLoadingPeriodComparison, setIsLoadingPeriodComparison] =
  useState<boolean>(false);
const [isLoadingWeeklyCumulative, setIsLoadingWeeklyCumulative] =
  useState<boolean>(false);
```

#### Tab Navigation Component

```typescript
const TabNavigation = () => (
  <div className="flex space-x-1 mb-6">
    <Button
      variant={activeTab === "current" ? "default" : "outline"}
      onClick={() => setActiveTab("current")}
    >
      Vista Actual
    </Button>
    <Button
      variant={activeTab === "period-comparison" ? "default" : "outline"}
      onClick={() => setActiveTab("period-comparison")}
    >
      Comparación por Períodos
    </Button>
    <Button
      variant={activeTab === "weekly-cumulative" ? "default" : "outline"}
      onClick={() => setActiveTab("weekly-cumulative")}
    >
      Acumulado Semanal
    </Button>
  </div>
);
```

#### Period Comparison Chart Component

**Chart Type**: Multi-series Line Chart or Grouped Bar Chart
**X-Axis**: Period names (e.g., "Enero 2024", "Febrero 2024")
**Y-Axis**: Amount values
**Series**: Each agrupador as a different colored line/bar

```typescript
const PeriodComparisonChart = () => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={transformedPeriodData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="period_name" />
      <YAxis tickFormatter={formatCurrency} />
      <Tooltip content={<CustomPeriodTooltip />} />
      <Legend />
      {groupers.map((grouper, index) => (
        <Line
          key={grouper.grouper_id}
          type="monotone"
          dataKey={`grouper_${grouper.grouper_id}`}
          stroke={COLORS[index % COLORS.length]}
          name={grouper.grouper_name}
          strokeWidth={2}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);
```

#### Weekly Cumulative Chart Component

**Chart Type**: Multi-series Line Chart
**X-Axis**: Week labels (e.g., "Semana del 01/12 - 07/12")
**Y-Axis**: Cumulative amount values
**Series**: Each agrupador as a different colored line

```typescript
const WeeklyCumulativeChart = () => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={transformedWeeklyData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="week_label" />
      <YAxis tickFormatter={formatCurrency} />
      <Tooltip content={<CustomWeeklyTooltip />} />
      <Legend />
      {groupers.map((grouper, index) => (
        <Line
          key={grouper.grouper_id}
          type="monotone"
          dataKey={`grouper_${grouper.grouper_id}`}
          stroke={COLORS[index % COLORS.length]}
          name={grouper.grouper_name}
          strokeWidth={2}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);
```

## Data Models

### Period Comparison Data Structure

```typescript
type PeriodComparisonData = {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
  }[];
}[];

// Transformed for chart consumption
type TransformedPeriodData = {
  period_name: string;
  [key: `grouper_${number}`]: number;
}[];
```

### Weekly Cumulative Data Structure

```typescript
type WeeklyCumulativeData = {
  week_start: string;
  week_end: string;
  week_label: string;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    cumulative_amount: number;
  }[];
}[];

// Transformed for chart consumption
type TransformedWeeklyData = {
  week_label: string;
  [key: `grouper_${number}`]: number;
}[];
```

## Error Handling

### API Error Handling

- **Invalid Parameters**: Return 400 status with descriptive error messages
- **Database Errors**: Return 500 status with sanitized error messages
- **No Data Found**: Return empty arrays with 200 status

### Frontend Error Handling

- **Loading States**: Show skeleton loaders for each chart type
- **Error States**: Display user-friendly error messages with retry options
- **Empty States**: Show appropriate messages when no data is available
- **Network Errors**: Toast notifications for failed API calls

## Testing Strategy

### API Endpoint Testing

1. **Period Comparison Endpoint**:

   - Test with different payment method filters
   - Verify data aggregation across multiple periods
   - Test with periods that have no expenses
   - Validate response format and data types

2. **Weekly Cumulative Endpoint**:
   - Test week boundary calculations (Sunday start)
   - Verify cumulative calculations are correct
   - Test with partial weeks (current week)
   - Test with different period months

### Frontend Component Testing

1. **Tab Navigation**:

   - Test tab switching maintains filter state
   - Verify correct chart renders for each tab
   - Test loading states during tab switches

2. **Chart Rendering**:

   - Test with various data scenarios (empty, single grouper, multiple groupers)
   - Verify tooltip functionality
   - Test responsive behavior

3. **Data Transformation**:
   - Test API response transformation for chart consumption
   - Verify proper handling of missing data points
   - Test currency formatting

### Integration Testing

1. **Filter Consistency**: Verify payment method filters work across all tabs
2. **Data Synchronization**: Ensure data updates when filters change
3. **Performance**: Test with large datasets and multiple periods

## Implementation Notes

### Week Boundary Logic

- Use PostgreSQL's `date_trunc('week', date)` which defaults to Monday start
- Adjust to Sunday start by subtracting 1 day: `date_trunc('week', date + interval '1 day') - interval '1 day'`
- Handle partial weeks by using `LEAST(week_end, CURRENT_DATE)`

### Data Transformation

- Transform API responses to chart-friendly format using dynamic keys
- Handle missing data points by filling with zero values
- Maintain consistent color mapping across charts

### Performance Considerations

- Use database aggregation instead of client-side calculations
- Implement proper indexing on `expenses(category_id, period_id, date)`
- Consider caching for period comparison data (rarely changes)
- Lazy load chart data only when tabs are activated

### Responsive Design

- Maintain existing responsive patterns from current dashboard
- Ensure charts work well on mobile devices
- Use appropriate chart heights for different screen sizes
