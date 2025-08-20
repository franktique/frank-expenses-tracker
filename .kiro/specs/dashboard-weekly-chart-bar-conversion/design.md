# Design Document

## Overview

This design outlines the conversion of the "Acumulado Semanal" chart in Dashboard Agrupadores from a LineChart to a BarChart using Recharts. The change will improve visualization of cumulative weekly data across periods with varying numbers of weeks while maintaining all existing functionality including filtering, projection mode, and error handling.

## Architecture

### Current Implementation Analysis

The current implementation uses:

- `LineChart` from Recharts with `Line` components for each agrupador
- Data transformation that creates week labels and grouper-specific data keys
- Custom tooltip component (`CustomWeeklyTooltip`)
- Responsive container with fixed height (500px)
- Chart colors from a predefined color array

### Proposed Changes

1. **Chart Component Replacement**: Replace `LineChart` with `BarChart` and `Line` components with `Bar` components
2. **Data Structure**: Maintain existing data transformation logic
3. **Visual Enhancements**: Optimize bar spacing and grouping for better readability
4. **Responsive Design**: Ensure proper scaling for periods with many weeks

## Components and Interfaces

### Modified Chart Component Structure

```typescript
// Current structure (to be replaced)
<LineChart data={transformedData}>
  <Line dataKey={`grouper_${grouper.grouper_id}`} />
</LineChart>

// New structure
<BarChart data={transformedData}>
  <Bar dataKey={`grouper_${grouper.grouper_id}`} />
</BarChart>
```

### Chart Configuration

#### Bar Chart Properties

- **Width**: 100% (responsive)
- **Height**: 500px (maintain current height)
- **Margin**: `{ top: 20, right: 30, left: 20, bottom: 80 }` (maintain current margins)
- **Bar Category Gap**: 20% (spacing between week groups)
- **Bar Gap**: 4 (spacing between bars within a group)

#### X-Axis Configuration

- **Data Key**: `week_label` (unchanged)
- **Angle**: -45 degrees (maintain current rotation)
- **Text Anchor**: "end" (maintain current alignment)
- **Height**: 100px (maintain current height)
- **Interval**: 0 (show all labels)
- **Font Size**: 11px (maintain current size)

#### Y-Axis Configuration

- **Tick Formatter**: `formatCurrency` (unchanged)
- **Domain**: Auto-calculated based on data

#### Bar Components

- **Fill**: Use existing `chartColors` array
- **Radius**: `[2, 2, 0, 0]` (rounded top corners)
- **Stroke Width**: 1 (subtle border)
- **Stroke**: Slightly darker shade of fill color

### Data Models

The existing data transformation logic will remain unchanged:

```typescript
interface WeeklyCumulativeData {
  week_start: string;
  week_end: string;
  week_label: string;
  grouper_data: Array<{
    grouper_id: number;
    grouper_name: string;
    cumulative_amount: number;
    cumulative_budget_amount?: number;
  }>;
}

interface TransformedChartData {
  week_label: string;
  [key: `grouper_${number}`]: number;
}
```

### Tooltip Enhancement

Modify the existing `CustomWeeklyTooltip` component to work optimally with bar charts:

```typescript
interface CustomWeeklyTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}
```

The tooltip will display:

- Week range (from label)
- Agrupador name and cumulative amount for each bar
- Formatted currency values
- Color indicators matching bar colors

## Error Handling

### Existing Error Handling (Maintained)

- Loading states with `LineChartSkeleton` (will be renamed to `ChartSkeleton`)
- Error boundaries with retry functionality
- Empty state handling for no data scenarios
- Graceful degradation for API failures

### Additional Considerations

- Handle cases where bar width becomes too narrow with many weeks
- Ensure tooltip positioning works correctly with bar chart layout
- Maintain accessibility features for screen readers

## Testing Strategy

### Unit Tests

1. **Chart Rendering**: Verify BarChart renders with correct data
2. **Data Transformation**: Ensure existing transformation logic works with bars
3. **Tooltip Functionality**: Test tooltip content and positioning
4. **Color Assignment**: Verify correct color mapping to agrupadores
5. **Responsive Behavior**: Test chart scaling with different data sizes

### Integration Tests

1. **Filter Integration**: Test chart updates with payment method and agrupador filters
2. **Projection Mode**: Verify chart switches between expense and budget data
3. **Error Scenarios**: Test error handling and retry functionality
4. **Loading States**: Verify skeleton display during data fetching

### Visual Regression Tests

1. **Chart Appearance**: Compare bar chart rendering across different screen sizes
2. **Many Weeks Scenario**: Test layout with periods containing 6+ weeks
3. **Few Weeks Scenario**: Test layout with periods containing 2-3 weeks
4. **Color Consistency**: Verify color assignment remains consistent

## Implementation Approach

### Phase 1: Core Chart Conversion

1. Replace LineChart with BarChart component
2. Replace Line components with Bar components
3. Update chart configuration properties
4. Test basic rendering functionality

### Phase 2: Visual Optimization

1. Fine-tune bar spacing and grouping
2. Optimize tooltip positioning for bars
3. Ensure proper color application
4. Test responsive behavior

### Phase 3: Integration Testing

1. Verify all existing filters work correctly
2. Test projection mode functionality
3. Validate error handling scenarios
4. Perform cross-browser testing

## Backward Compatibility

This change maintains full backward compatibility with:

- Existing API endpoints (no changes required)
- Data transformation logic (reused as-is)
- Filter functionality (unchanged)
- Projection mode (unchanged)
- Error handling patterns (unchanged)

The only user-visible change will be the visual representation switching from lines to bars, which improves the user experience without breaking any existing functionality.
