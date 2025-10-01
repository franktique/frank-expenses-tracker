# Fixed Table Header Implementation Plan

**Branch**: `budget-comparison`
**Feature**: Make the presupuestos table header sticky/fixed when scrolling
**Date**: October 1, 2025

## Overview
The presupuestos menu displays a table with budget details per category. Currently, when users scroll down through many category rows, the table header disappears from view. This enhancement will make the header remain visible (sticky) at the top of the table container while scrolling through the data rows.

## Current State Analysis
- **Component**: `components/budgets-view.tsx` (lines 276-446)
- **Table Structure**: Uses custom UI components from `@/components/ui/table`
- **Table Wrapper**: Table component wraps content in a `div` with `overflow-auto` class
- **Header Columns**:
  - Categoría
  - Optional comparison columns (Efectivo (Ref), Crédito (Ref), Total (Ref))
  - Efectivo, Crédito, Total
  - Acciones

## Technical Approach

### Solution: CSS Sticky Positioning
We'll use CSS `position: sticky` to make the table header fixed while scrolling. This approach:
- ✅ Works with existing table structure
- ✅ Maintains responsive design
- ✅ Minimal code changes required
- ✅ No JavaScript needed
- ✅ Compatible with dynamic column headers (comparison mode)

## Implementation Plan

### Phase 1: Update Table Component Structure ✅
- [x] Modify the `Table` component wrapper in `components/ui/table.tsx` to support sticky headers
- [x] Add a `max-height` constraint to the table container to enable scrolling
- [x] Ensure the wrapper `div` has proper `overflow-y: auto` and `position: relative`

### Phase 2: Style TableHeader for Sticky Positioning ✅
- [x] Update `TableHeader` component to accept sticky positioning
- [x] Add `position: sticky`, `top: 0`, and `z-index` styles to keep header above content
- [x] Add background color to header to prevent content showing through when scrolling
- [x] Ensure border-bottom remains visible during scroll

### Phase 3: Update BudgetsView Component ✅
- [x] Apply appropriate classes to the `Table` component in `budgets-view.tsx` (line 276)
- [x] Set a reasonable `max-height` for the table container (e.g., `max-h-[600px]` or dynamic based on viewport)
- [x] Test with both comparison mode enabled and disabled
- [x] Verify edit buttons and "Agregar" buttons remain functional during scroll

### Phase 4: Testing & Refinement ✅
- [x] Test with varying numbers of categories (few vs many rows)
- [x] Test with comparison period selected (additional columns)
- [x] Test responsiveness on different screen sizes (mobile, tablet, desktop)
- [x] Verify z-index doesn't conflict with dialogs or other overlays
- [x] Ensure header alignment with table body columns remains perfect
- [x] Test with different theme modes (if applicable)

### Phase 5: Edge Cases & Polish ✅
- [x] Ensure the "Total Presupuestado" summary card above table is not affected
- [x] Verify scrollbar appears correctly (not overlapping content)
- [x] Test keyboard navigation (tab through cells)
- [x] Check accessibility (screen reader compatibility with sticky header)
- [x] Add smooth scrolling behavior if needed

## Implementation Summary

**Date Completed**: October 1, 2025

All phases have been successfully implemented and tested. The sticky header feature is now working correctly in the presupuestos table.

## Technical Implementation Details

### Table Component Changes (`components/ui/table.tsx`)
```tsx
// Add optional sticky prop and max-height support
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { stickyHeader?: boolean }
>(({ className, stickyHeader, ...props }, ref) => (
  <div className={cn(
    "relative w-full overflow-auto",
    stickyHeader && "max-h-[600px]", // or make configurable
    className
  )}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
```

### TableHeader Component Changes
```tsx
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b",
      sticky && "sticky top-0 z-10 bg-background",
      className
    )}
    {...props}
  />
))
```

### BudgetsView Component Usage
```tsx
<Table stickyHeader className="max-h-[600px]">
  <TableHeader sticky>
    {/* existing header content */}
  </TableHeader>
  <TableBody>
    {/* existing body content */}
  </TableBody>
</Table>
```

## CSS Considerations

### Z-Index Stack
- Dialog overlay: typically `z-50`
- Table sticky header: `z-10` (below dialogs, above table content)
- Table body: `z-0` (default)

### Background Color
- Header needs solid background to hide scrolling content
- Use `bg-background` for consistency with theme
- Add subtle shadow or border to enhance visual separation

### Responsive Design
- On mobile: Consider reducing `max-height` or making it viewport-relative
- Ensure horizontal scroll (if needed) works with vertical sticky header
- Test with narrow viewports where column headers might wrap

## Success Criteria
- ✅ Table header remains visible when scrolling through category rows
- ✅ Header maintains proper alignment with table columns
- ✅ Works in both normal and comparison mode
- ✅ Responsive on all screen sizes
- ✅ No visual glitches or z-index conflicts
- ✅ Edit and action buttons remain clickable during scroll
- ✅ Smooth user experience with no performance issues

## Rollback Plan
If issues arise, we can:
1. Remove `stickyHeader` prop usage from BudgetsView
2. Remove sticky styling from TableHeader
3. Revert to previous scrolling behavior

## Future Enhancements (Optional)
- [ ] Make max-height configurable via component prop
- [ ] Add resize handle to adjust table height dynamically
- [ ] Implement virtual scrolling for very large datasets
- [ ] Add "scroll to top" button for long tables
- [ ] Persist user's preferred table height in localStorage

## Related Files
- `components/budgets-view.tsx` - Main component to update
- `components/ui/table.tsx` - Base table components
- `styles/globals.css` - If custom CSS needed for sticky behavior

## Notes
- Ensure the implementation follows the existing codebase patterns
- Maintain consistency with Tailwind CSS utility classes
- Test thoroughly with the existing budget data
- Consider performance with large numbers of categories (100+)
