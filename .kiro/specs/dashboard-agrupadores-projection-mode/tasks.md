# Implementation Plan

- [x] 1. Add projection mode state management to dashboard component

  - Add `projectionMode` state variable to the dashboard groupers page component
  - Implement state setter function with proper TypeScript typing
  - Add session storage integration for projection mode persistence
  - _Requirements: 1.6, 1.7, 5.1, 5.2, 5.3_

- [x] 2. Create projection mode checkbox UI component

  - Add Checkbox import from UI components library
  - Implement projection checkbox with proper styling and positioning in filter controls area
  - Add conditional disable logic based on active tab (only enabled for "Vista Actual")
  - Implement proper ARIA labels and accessibility attributes
  - _Requirements: 1.1, 1.2, 1.3, 3.1_

- [x] 3. Implement data transformation logic for projection mode

  - Create `processProjectionData` function to transform grouper data for projection
  - Add logic to use `budget_amount` as `total_amount` when projection mode is enabled
  - Implement fallback handling for missing budget data (show zero values)
  - Add `isProjectiond` flag to data objects for styling purposes
  - _Requirements: 1.4, 1.5, 2.6_

- [x] 4. Modify chart rendering to support projection mode

  - Update grouper chart component to handle projectiond data styling
  - Implement different visual styling for projectiond data (opacity, colors, or patterns)
  - Add chart title modification to include "(Simulación)" indicator when in projection mode
  - Update chart legend to show "Presupuesto" instead of "Gastos" in projection mode
  - _Requirements: 3.2, 3.4_

- [x] 5. Enhance tooltips for projection mode

  - Modify tooltip content to display "Presupuesto: $X" format in projection mode
  - Update tooltip logic to clearly indicate budget vs actual expense data
  - Ensure tooltips work correctly with filtered data in projection mode
  - _Requirements: 3.3, 3.5_

- [x] 6. Integrate projection mode with existing filter system

  - Ensure projection mode works with Estudio filter selections
  - Implement projection mode compatibility with Agrupador filter selections
  - Handle Payment Method filter interaction with projection mode (budgets are payment-method agnostic)
  - Maintain filter state when toggling between projection and actual modes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement category drill-down projection support

  - Modify category data fetching to support projection mode
  - Update category chart rendering to use budget data when projection mode is enabled
  - Ensure category chart maintains projection styling consistency
  - Implement proper state management when navigating between grouper and category views
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Add session storage persistence for projection mode

  - Implement session storage save/load functions for projection mode state
  - Add proper error handling for session storage operations
  - Ensure projection mode state is restored on page refresh
  - Implement session cleanup on component unmount
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Implement error handling and fallback mechanisms

  - Add error handling for missing budget data scenarios
  - Implement fallback to actual data when projection fails
  - Add user-friendly error messages for projection-specific issues
  - Create proper error recovery strategies for API failures
  - _Requirements: 2.6, 4.5_

- [x] 10. Optimize performance and add final polish
  - Implement React.memo for chart components to prevent unnecessary re-renders
  - Add efficient caching for budget data to minimize API calls
  - Optimize chart animations for smooth mode switching
  - Add proper cleanup and memory management for projection state
  - _Requirements: Performance and user experience optimization_
