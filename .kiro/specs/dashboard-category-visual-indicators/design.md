# Design Document

## Overview

This feature adds visual indicators to the dashboard's budget summary table by graying out category names that have no expenses registered for the current period. The implementation leverages the existing dashboard data structure and adds conditional styling based on expense amounts.

## Architecture

### Data Flow

The feature integrates with the existing dashboard data flow:

1. **API Layer**: The `/api/dashboard` endpoint already provides `total_amount` for each category in the `budgetSummary` array
2. **Component Layer**: The `DashboardView` component will apply conditional styling based on the `total_amount` value
3. **UI Layer**: Tailwind CSS classes will be used to implement the grayed-out styling

### Integration Points

- **Dashboard API**: No changes required - already provides expense data per category
- **Dashboard Component**: Modify the table cell rendering logic for category names
- **Type System**: Extend existing types if needed for styling logic

## Components and Interfaces

### Modified Components

#### DashboardView Component (`components/dashboard-view.tsx`)

**Current Structure:**

```typescript
<TableCell className="font-medium">{item.category_name}</TableCell>
```

**Enhanced Structure:**

```typescript
<TableCell className={`font-medium ${getCategoryNameStyle(item)}`}>
  {item.category_name}
</TableCell>
```

#### New Utility Function

```typescript
function getCategoryNameStyle(item: BudgetSummaryItem): string {
  // Category has no expenses if total_amount is 0
  const hasNoExpenses = item.total_amount === 0;

  return hasNoExpenses ? "text-muted-foreground" : "";
}
```

### Data Models

No changes to existing data models are required. The feature uses the existing `BudgetSummaryItem` interface:

```typescript
interface BudgetSummaryItem {
  category_id: string;
  category_name: string;
  total_amount: number; // Used to determine if category has expenses
  // ... other fields
}
```

### Styling Strategy

#### CSS Classes

- **Active Categories**: Default text color (no additional classes)
- **Inactive Categories**: `text-muted-foreground` class for grayed-out appearance

#### Theme Compatibility

The `text-muted-foreground` class automatically adapts to both light and dark themes:

- **Light Theme**: Muted gray color with sufficient contrast
- **Dark Theme**: Appropriately dimmed color for dark backgrounds

#### Accessibility Considerations

- Maintains sufficient color contrast ratios (WCAG AA compliance)
- Text remains fully readable in both states
- No reliance on color alone - the information is supplementary

## Error Handling

### Edge Cases

1. **Zero Expenses**: Categories with `total_amount === 0` are styled as inactive
2. **Negative Expenses**: Categories with `total_amount < 0` (refunds) are styled as active
3. **Null/Undefined Values**: Treated as zero expenses (inactive styling)
4. **Data Loading States**: No special handling needed - styling applies after data loads

### Fallback Behavior

If the `total_amount` field is missing or invalid:

- Default to active styling (no graying out)
- Log warning for debugging purposes
- Graceful degradation without breaking the table

## Testing Strategy

### Unit Tests

1. **Utility Function Tests**

   - Test `getCategoryNameStyle` with various `total_amount` values
   - Verify correct CSS class returns for active/inactive states
   - Test edge cases (null, undefined, negative values)

2. **Component Integration Tests**
   - Verify styling is applied correctly in the table
   - Test with mock data containing both active and inactive categories
   - Ensure styling updates when data changes

### Visual Regression Tests

1. **Screenshot Comparisons**
   - Capture dashboard table with mixed active/inactive categories
   - Test both light and dark themes
   - Verify contrast ratios meet accessibility standards

### Accessibility Tests

1. **Color Contrast Testing**
   - Verify muted text meets WCAG AA standards
   - Test with various browser zoom levels
   - Validate with screen reader compatibility

### Integration Tests

1. **Data Flow Testing**
   - Test with real API data containing zero-expense categories
   - Verify styling updates when expenses are added/removed
   - Test fund filtering scenarios

## Implementation Approach

### Phase 1: Core Styling Logic

1. Create utility function for determining category name styling
2. Apply conditional styling to category name table cells
3. Test with static data to verify visual appearance

### Phase 2: Integration and Testing

1. Integrate with existing dashboard data flow
2. Add comprehensive unit tests
3. Perform visual testing across themes

### Phase 3: Accessibility and Polish

1. Verify accessibility compliance
2. Test with screen readers
3. Optimize performance if needed

## Performance Considerations

### Minimal Impact

- **No API Changes**: Leverages existing data structure
- **Simple Logic**: Single comparison per category row
- **CSS-Only Styling**: No JavaScript animations or complex rendering
- **Memoization**: Consider memoizing style calculation if performance issues arise

### Scalability

The solution scales linearly with the number of categories, which is typically a small number (10-50 categories per user), so performance impact is negligible.

## Security Considerations

No security implications as this is a purely visual enhancement that doesn't modify data or expose additional information.

## Backward Compatibility

The feature is fully backward compatible:

- No API changes required
- No database schema modifications
- Graceful degradation if data is missing
- No breaking changes to existing functionality
