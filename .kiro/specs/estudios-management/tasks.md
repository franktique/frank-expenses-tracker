# Implementation Plan

- [x] 1. Create database schema and API foundation
  - Create database tables for estudios and estudio_groupers relationships
  - Implement SQL migration script with proper constraints and indexes
  - _Requirements: 1.4, 2.4_

- [x] 2. Implement estudios CRUD API endpoints
  - Create GET /api/estudios endpoint to list all estudios with grouper counts
  - Create POST /api/estudios endpoint to create new estudios with validation
  - Create PUT /api/estudios/[id] endpoint to update estudio names
  - Create DELETE /api/estudios/[id] endpoint to delete estudios
  - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Implement estudio-grouper relationship API endpoints
  - Create GET /api/estudios/[id]/groupers endpoint to fetch groupers for specific estudio
  - Create POST /api/estudios/[id]/groupers endpoint to add groupers to estudio
  - Create DELETE /api/estudios/[id]/groupers/[grouperId] endpoint to remove groupers from estudio
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Create estudios management page component
  - Implement EstudiosPage component with table view for listing estudios
  - Add create, edit, and delete dialogs with form validation
  - Include grouper count display and management actions
  - Implement error handling and loading states with toast notifications
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3_

- [x] 5. Create estudio-grouper management page component
  - Implement EstudioGroupersPage component for managing groupers within an estudio
  - Add interface to display current groupers and available groupers for assignment
  - Implement add/remove grouper functionality with confirmation dialogs
  - Add navigation breadcrumbs and proper page structure
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Add estudios menu item to navigation
  - Update AppSidebar component to include "Estudios" menu item
  - Position between "Agrupadores" and "Dashboard Agrupadores" with appropriate icon
  - Implement active state detection for estudios routes
  - _Requirements: 1.1_

- [x] 7. Create estudio filter component for dashboard
  - Implement EstudioFilter component as dropdown selector
  - Add loading states and error handling for estudios data fetching
  - Implement default selection logic (first estudio) and empty state handling
  - Style consistently with existing filter components
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 8. Integrate estudio filtering into dashboard API endpoints
  - Modify /api/dashboard/groupers route to accept estudioId parameter
  - Update /api/dashboard/groupers/period-comparison to filter by estudio
  - Update /api/dashboard/groupers/weekly-cumulative to filter by estudio
  - Update /api/dashboard/groupers/budgets to filter by estudio
  - _Requirements: 3.3, 3.4_

- [x] 9. Update dashboard page to include estudio filtering
  - Add EstudioFilter as first filter in GroupersChartPage component
  - Implement estudio selection state management across all dashboard tabs
  - Update data fetching logic to include selected estudio in API calls
  - Add handling for estudio deletion and automatic fallback selection
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 10. Implement filter state persistence across dashboard tabs
  - Ensure estudio selection persists when switching between dashboard tabs
  - Implement proper state synchronization between current, period-comparison, and weekly-cumulative views
  - Add session storage or URL parameter persistence for estudio selection
  - Test filter consistency across all three dashboard tabs
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 11. Add comprehensive error handling and edge cases
  - Implement proper error messages for no estudios available scenario
  - Add handling for deleted estudio selection with automatic fallback
  - Implement loading states and retry mechanisms for all API calls
  - Add validation for edge cases like empty estudio names and duplicate assignments
  - _Requirements: 3.5, 4.4, 5.5_
