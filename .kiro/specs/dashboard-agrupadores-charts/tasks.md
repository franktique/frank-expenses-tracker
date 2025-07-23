# Implementation Plan

- [x] 1. Create period comparison API endpoint

  - Create `/app/api/dashboard/groupers/period-comparison/route.ts` with GET method
  - Implement SQL query to aggregate grouper totals across all periods using CROSS JOIN
  - Add payment method filtering support with conditional WHERE clauses
  - Return structured data with period information and grouper totals
  - _Requirements: 1.2, 1.3, 1.6_

- [x] 2. Create weekly cumulative API endpoint

  - Create `/app/api/dashboard/groupers/weekly-cumulative/route.ts` with GET method
  - Implement PostgreSQL CTE query for week boundary generation starting on Sundays
  - Add cumulative SUM window function for running totals per grouper per week
  - Handle partial weeks by using CURRENT_DATE as end boundary
  - Add payment method filtering support
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.8_

- [x] 3. Add tab navigation to groupers dashboard page

  - Modify `/app/dashboard/groupers/page.tsx` to include tab state management
  - Create tab navigation component with three tabs: "Vista Actual", "Comparación por Períodos", "Acumulado Semanal"
  - Implement tab switching logic that maintains filter state across tabs
  - Add conditional rendering based on active tab
  - _Requirements: 1.1, 2.1, 3.1, 3.2_

- [x] 4. Implement period comparison chart component

  - Add state management for period comparison data and loading states
  - Create data fetching function for period comparison API endpoint
  - Implement data transformation logic to convert API response to chart-friendly format
  - Create LineChart component using Recharts with multiple series for each grouper
  - Add custom tooltip showing period, grouper name, and amount
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 5. Implement weekly cumulative chart component

  - Add state management for weekly cumulative data and loading states
  - Create data fetching function for weekly cumulative API endpoint
  - Implement data transformation logic for cumulative chart format
  - Create LineChart component with cumulative data visualization
  - Add custom tooltip showing week range, grouper name, and cumulative amount
  - _Requirements: 2.2, 2.5, 2.6, 2.7_

- [x] 6. Integrate filter synchronization across all chart tabs

  - Modify existing payment method filter to work with all three chart types
  - Ensure filter changes trigger data refresh for the currently active tab
  - Maintain filter state when switching between tabs
  - Update loading states appropriately for each chart type
  - _Requirements: 1.6, 2.8, 3.2, 3.3_

- [x] 7. Add error handling and empty states for new charts

  - Implement error handling for new API endpoints with user-friendly error messages
  - Add loading skeleton components for period comparison and weekly cumulative charts
  - Create empty state messages when no data is available for new chart types
  - Add toast notifications for API failures in new chart components
  - _Requirements: 3.4, 3.5, 3.6_
