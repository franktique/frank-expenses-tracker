# Plan: Add Scroll to "Configuración de Fondos" Section in Expenses Form

**Branch**: `feat/add-scroll-expenses-form`

## Problem Statement

When the "Configuración de Fondos" section is expanded in the expense form dialog, users cannot scroll to reach fields below (Period, Date, Event, Payment Method, Description, Amount, Pending toggle, and Credit Card selector). The dialog content extends beyond the viewport without scrolling capability, making the form fields below inaccessible.

## Root Cause Analysis

The `DialogContent` component in `/components/ui/dialog.tsx` uses `fixed` positioning with centered transform, but lacks overflow and max-height constraints. The form content in `/components/expense-form-dialog.tsx` is wrapped in a `div` with `grid gap-4 py-4` (line 337), but this container doesn't have scroll behavior defined.

When the "Configuración de Fondos" collapsible section expands:
- **Lines 389-448** in `expense-form-dialog.tsx` show the collapsible container
- **Lines 406-446** contain the expanded content with 3 major components:
  - FundSelectionConstraintIndicator
  - SourceFundSelector (required field)
  - FundFilter for destination (optional)
- This expansion pushes remaining form fields (lines 450-588) below the viewport
- No scrolling mechanism exists to access hidden content

## Solution Approach

Add scrolling capability to the dialog content area while maintaining the header and footer in fixed positions. This ensures users can access all form fields regardless of the "Configuración de Fondos" section state.

### Implementation Strategy

1. **Modify DialogContent component** (`/components/ui/dialog.tsx`)
   - Add max-height constraint based on viewport height
   - Enable overflow-y auto on the dialog container
   - Ensure proper scrollbar styling for dark mode compatibility

2. **Update expense form structure** (`/components/expense-form-dialog.tsx`)
   - Wrap form content in a scrollable container
   - Keep DialogHeader and DialogFooter outside the scroll area
   - Add appropriate padding/margins for scroll indicators

## Implementation Plan

### Task 1: Update Dialog Component for Scroll Support
**File**: `/components/ui/dialog.tsx`

- [x] Add max-height constraint to DialogContent (e.g., `max-h-[85vh]` or `max-h-[90vh]`)
- [x] Add overflow-y auto to enable vertical scrolling
- [x] Test on different screen sizes (mobile, tablet, desktop)
- [x] Verify dark mode scrollbar styling

**Expected Changes**:
```tsx
// In DialogContent className (line 56-58)
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[90vh] overflow-y-auto ...",
  className
)}
```

### Task 2: Verify Expense Form Layout
**File**: `/components/expense-form-dialog.tsx`

- [x] Test form with "Configuración de Fondos" collapsed
- [x] Test form with "Configuración de Fondos" expanded
- [x] Verify all fields are accessible via scrolling
- [x] Check that DialogHeader remains visible at top
- [x] Check that DialogFooter remains visible at bottom
- [x] Verify smooth scrolling experience

**No code changes expected** - the existing structure should work with the Dialog component updates.

### Task 3: Cross-Browser and Responsive Testing

- [ ] Test in Chrome/Edge (desktop)
- [ ] Test in Firefox (desktop)
- [ ] Test in Safari (macOS/iOS)
- [ ] Test on mobile devices (iOS/Android)
- [ ] Test with different viewport heights (small laptops, tablets, large monitors)
- [ ] Verify scrollbar appearance in light/dark modes

### Task 4: Accessibility Validation

- [ ] Ensure keyboard navigation works correctly (Tab, Shift+Tab)
- [ ] Verify screen reader compatibility with scrollable region
- [ ] Test that focus management works when scrolling
- [ ] Confirm that scroll position resets when dialog opens/closes

## Technical Details

### Affected Files
1. `/components/ui/dialog.tsx` (lines 46-71) - DialogContent component
2. `/components/expense-form-dialog.tsx` (lines 328-605) - Expense form dialog structure

### CSS Classes to Add
- `max-h-[90vh]` - Maximum height constraint (90% of viewport height)
- `overflow-y-auto` - Enable vertical scrolling when content exceeds max-height

### Scroll Behavior Specifications
- **Trigger**: Content height exceeds max-height threshold
- **Scroll Area**: Only the middle content area (between header and footer)
- **Fixed Elements**: DialogHeader and DialogFooter should remain visible
- **Scrollbar**: Native browser scrollbar with dark mode support

## Testing Checklist

### Functional Tests
- [ ] Dialog opens without scroll when content is short
- [ ] Dialog shows scrollbar when "Configuración de Fondos" is expanded
- [ ] All form fields are accessible via scrolling
- [ ] Form submission works correctly
- [ ] Form cancellation/close works correctly
- [ ] Scroll position resets when dialog reopens

### Visual Tests
- [ ] Scrollbar appears only when needed
- [ ] Scrollbar styling matches theme (light/dark mode)
- [ ] No layout shifts when scrollbar appears/disappears
- [ ] Content padding is preserved
- [ ] Orange border on "Configuración de Fondos" displays correctly

### Edge Cases
- [ ] Very long category lists with search
- [ ] Multiple funds in source fund selector
- [ ] Long fund constraint indicator messages
- [ ] Small viewport heights (e.g., 600px)
- [ ] Zoom levels (100%, 125%, 150%)

## Success Criteria

1. ✅ Users can scroll to access all form fields when "Configuración de Fondos" is expanded
2. ✅ Scrolling is smooth and intuitive
3. ✅ DialogHeader and DialogFooter remain visible (if implementing sticky positioning)
4. ✅ No visual regressions in other dialogs using DialogContent
5. ✅ Works across all supported browsers and devices
6. ✅ Maintains accessibility standards

## Rollback Plan

If issues arise:
1. Revert changes to `/components/ui/dialog.tsx`
2. Alternative solution: Add scroll only to the form content div in `expense-form-dialog.tsx`

## Notes

- **Minimal Change Approach**: Prefer adding scroll to DialogContent rather than restructuring the expense form
- **Global Impact**: Changes to Dialog component will affect all dialogs in the application - test thoroughly
- **Alternative Approach**: If global changes cause issues, implement scroll only in the expense form's content div (line 337)
