# Implementation Plan

- [x] 1. Create period deactivation API endpoint
  - Create new API route at `/app/api/periods/close/[id]/route.ts`
  - Implement POST handler that sets `is_open = false` for the specified period
  - Add proper error handling for invalid period IDs and database errors
  - Return updated period object in response
  - _Requirements: 1.1, 1.2_

- [x] 2. Extend budget context with period deactivation functionality
  - Add `closePeriod` function to `BudgetContextType` interface in `context/budget-context.tsx`
  - Implement `closePeriod` function with optimistic updates
  - Update `activePeriod` state to null when a period is deactivated
  - Add error handling with state rollback on API failures
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement confirmation dialog for period activation
  - Create confirmation dialog component in `components/periods-view.tsx`
  - Add state management for confirmation dialog visibility and target period
  - Display current active period and target period names in confirmation message
  - Implement confirm/cancel actions with proper state updates
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Update periods view with deactivation buttons and improved UX
  - Modify action button logic to show "Desactivar" for active periods
  - Add loading states for deactivation operations ("Desactivando...")
  - Implement confirmation dialog trigger when activating period with existing active period
  - Disable all action buttons during any period operation to prevent race conditions
  - _Requirements: 1.1, 3.1, 3.2, 3.3, 2.4_

- [x] 5. Add comprehensive error handling and user feedback
  - Implement toast notifications for successful deactivation operations
  - Add specific error messages for different failure scenarios
  - Ensure proper error recovery with data refresh on failures
  - Test and handle edge cases like concurrent operations
  - _Requirements: 1.3, 1.4_
