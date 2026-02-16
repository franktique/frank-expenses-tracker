# Implementation Plan

- [x] 1. Create budget aggregation API endpoint
  - Create new API route `/api/dashboard/groupers/budgets` for budget data aggregation
  - Implement SQL query to aggregate category budgets by grouper and period
  - Add proper error handling and parameter validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2. Enhance existing groupers API with filtering and budget support
  - Modify `/api/dashboard/groupers/route.ts` to accept grouperIds parameter for filtering
  - Add includeBudgets parameter to optionally include budget data in response
  - Update SQL queries to support grouper filtering and budget joins
  - _Requirements: 1.3, 2.3, 2.7, 4.1, 4.4_

- [x] 3. Enhance period comparison API with filtering and budget support
  - Modify `/api/dashboard/groupers/period-comparison/route.ts` to accept grouperIds parameter
  - Add includeBudgets parameter for budget data inclusion
  - Update SQL queries to support filtering and budget aggregation across periods
  - _Requirements: 1.3, 3.3, 3.7, 4.5_

- [x] 4. Create agrupador filter UI component
  - Create `AgrupadorFilter` component with multi-select dropdown functionality
  - Implement "Select All" and individual selection logic using Radix UI components
  - Add loading states and error handling for filter options
  - _Requirements: 1.1, 1.2, 1.5, 1.8_

- [x] 5. Create budget toggle UI component
  - Create `BudgetToggle` component with checkbox for enabling/disabling budget display
  - Implement proper labeling and accessibility features
  - Add disabled state handling for when budget data is unavailable
  - _Requirements: 2.1, 3.1_

- [x] 6. Integrate filter components into main dashboard page
  - Add AgrupadorFilter and BudgetToggle components to GroupersChartPage
  - Implement state management for selected groupers and budget display preferences
  - Add filter controls to the dashboard header with proper spacing and layout
  - _Requirements: 1.1, 1.6, 2.1, 3.1, 5.4_

- [x] 7. Implement filtering logic in data fetching
  - Update useEffect hooks to include selected groupers in API calls
  - Modify data fetching functions to pass grouperIds parameter to APIs
  - Implement proper loading states when filters change
  - _Requirements: 1.3, 1.8, 5.5_

- [x] 8. Implement budget data fetching and integration
  - Add budget data fetching when budget toggle is enabled
  - Integrate budget data with existing expense data in component state
  - Handle cases where budget data is missing or incomplete
  - _Requirements: 2.2, 2.4, 3.2, 3.4, 4.2, 4.3_

- [x] 9. Enhance current view chart to display budget data
  - Modify the BarChart in current view to show budget bars alongside expense bars
  - Implement different colors/patterns for budget vs expense bars
  - Update chart tooltips to distinguish between budget and expense data
  - _Requirements: 2.2, 2.3, 2.5, 2.8_

- [x] 10. Enhance period comparison chart to display budget data
  - Modify the LineChart in period comparison to show budget lines alongside expense lines
  - Implement different line styles for budget vs expense data
  - Update chart tooltips to show budget information with proper labeling
  - _Requirements: 3.2, 3.3, 3.5, 3.8_

- [x] 11. Update category breakdown view with filtering support
  - Modify category data fetching to respect agrupador filters
  - Update category chart to show budget vs actual for individual categories when budget toggle is enabled
  - Ensure category view maintains filter context from parent agrupador selection
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 12. Implement filter state persistence across tabs
  - Ensure selected groupers and budget display settings persist when switching tabs
  - Update tab change handlers to maintain filter state
  - Implement proper state synchronization between different chart views
  - _Requirements: 1.6, 5.4, 5.5_

- [x] 13. Add empty state handling for filtered results
  - Implement empty state component for when no groupers are selected
  - Add appropriate messaging when filtered results return no data
  - Ensure empty states work correctly across all chart tabs
  - _Requirements: 1.5_

- [x] 14. Implement error handling and retry mechanisms
  - Add error states for filter loading failures
  - Implement retry functionality for budget data fetching errors
  - Add user-friendly error messages for various failure scenarios
  - _Requirements: 5.6, 5.7_
