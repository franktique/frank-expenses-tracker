# Implementation Plan

- [x] 1. Database Schema Setup and Migration

  - Create funds table with proper constraints and default fund
  - Add fund_id columns to categories and incomes tables
  - Add destination_fund_id column to expenses table
  - Create database migration script with rollback capability
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Core Fund Data Models and Types

  - Define Fund interface with all required properties
  - Update Category, Income, and Expense interfaces to include fund fields
  - Create fund-related type definitions and enums
  - Add fund validation schemas using Zod
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1_

- [x] 3. Fund Management API Endpoints
- [x] 3.1 Implement basic CRUD operations for funds

  - Create GET /api/funds endpoint to list all funds with balances
  - Create POST /api/funds endpoint for fund creation with validation
  - Create GET /api/funds/[id] endpoint for individual fund details
  - Create PUT /api/funds/[id] endpoint for fund updates
  - Create DELETE /api/funds/[id] endpoint with referential integrity checks
  - _Requirements: 1.1, 1.2, 1.6, 8.1, 8.2_

- [x] 3.2 Implement fund balance calculation and recalculation

  - Create POST /api/funds/[id]/recalculate endpoint
  - Implement balance calculation logic considering initial balance, incomes, and expenses
  - Add proper error handling for calculation failures
  - Include fund start date filtering in calculations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.3_

- [x] 4. Update Existing API Endpoints for Fund Support
- [x] 4.1 Enhance categories API with fund assignment

  - Modify POST /api/categories to accept optional fund_id
  - Modify PUT /api/categories/[id] to handle fund assignment changes
  - Update GET /api/categories to include fund information in responses
  - Add validation to ensure fund exists when assigned
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1_

- [x] 4.2 Enhance incomes API with fund assignment

  - Modify POST /api/incomes to accept optional fund_id
  - Modify PUT /api/incomes/[id] to handle fund assignment changes
  - Update GET /api/incomes to include fund information in responses
  - Implement automatic balance updates when income fund changes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1_

- [x] 4.3 Enhance expenses API with fund filtering and destinations

  - Modify POST /api/expenses to accept optional destination_fund_id
  - Modify PUT /api/expenses/[id] to handle destination fund changes
  - Update GET /api/expenses to include fund information and support fund filtering
  - Implement fund transfer logic when destination_fund_id is specified
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1_

- [x] 5. Fund Dashboard API Endpoints
- [x] 5.1 Create fund analytics endpoints

  - Create GET /api/dashboard/funds endpoint for fund dashboard data
  - Create GET /api/dashboard/funds/balances endpoint for balance trends
  - Create GET /api/dashboard/funds/transfers endpoint for transfer history
  - Implement fund allocation percentage calculations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5.2 Enhance existing dashboard API with fund filtering

  - Modify GET /api/dashboard/route.ts to accept fund filter parameter
  - Update GET /api/dashboard/charts to support fund-based filtering
  - Modify all dashboard queries to respect fund filtering
  - Ensure backward compatibility when no fund filter is provided
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Core Fund Management Components
- [x] 6.1 Create FundsView component

  - Implement fund list display with current balances
  - Create fund creation dialog with name, description, initial balance, and start date fields
  - Implement fund editing dialog with validation
  - Add fund deletion with referential integrity warnings
  - Include recalculate balance button for each fund
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.2 Create FundFilter component

  - Implement reusable fund selection dropdown
  - Add support for "All Funds" option
  - Implement filter state management and persistence
  - Add loading states and error handling
  - _Requirements: 4.1, 4.2, 6.1, 6.2, 6.4_

- [x] 6.3 Create FundsDashboard component

  - Implement fund balance overview cards
  - Create fund balance trends chart using Recharts
  - Add fund allocation pie chart
  - Implement recent fund transfers table
  - Add fund performance metrics display
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7. Update Existing Components for Fund Integration
- [x] 7.1 Enhance CategoriesView component

  - Add fund selection field to category creation dialog
  - Add fund selection field to category editing dialog
  - Display fund assignment in category list table
  - Implement fund-based category filtering
  - Handle default fund assignment when no fund is selected
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7.2 Enhance ExpensesView component

  - Add mandatory fund filter at the top of the page
  - Set default fund filter to 'Disponible'
  - Filter available categories based on selected fund
  - Add optional destination fund field to expense creation dialog
  - Add optional destination fund field to expense editing dialog
  - Display destination fund information in expense list
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7.3 Enhance IncomesView component

  - Add optional fund selection field to income creation dialog
  - Add optional fund selection field to income editing dialog
  - Display fund assignment in income list table
  - Handle default fund assignment when no fund is selected
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7.4 Enhance main Dashboard component

  - Add fund filter at the top of the dashboard
  - Implement fund filtering for all existing charts
  - Add "All Funds" option to show combined data
  - Maintain filter selection during session
  - Reset filter to "All Funds" on page refresh
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Navigation and Routing Updates
- [x] 8.1 Add Fondos menu option

  - Update app-sidebar.tsx to include Fondos menu item
  - Create /app/fondos/page.tsx route
  - Add proper navigation highlighting for active route
  - _Requirements: 1.1_

- [x] 8.2 Add Funds Dashboard menu option

  - Update app-sidebar.tsx to include Funds Dashboard menu item
  - Create /app/dashboard/fondos/page.tsx route
  - Add proper navigation highlighting for active route
  - _Requirements: 7.1_

- [x] 9. Context and State Management Updates
- [x] 9.1 Enhance BudgetContext with fund management

  - Add funds state management to budget context
  - Implement fund CRUD operations in context
  - Add fund filtering state management
  - Update context to handle fund balance calculations
  - Add fund-related error handling in context
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9.2 Update existing context operations for fund support

  - Modify category operations to handle fund assignments
  - Modify income operations to handle fund assignments
  - Modify expense operations to handle fund filtering and destinations
  - Update dashboard data fetching to support fund filtering
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Documentation and Error Handling
- [x] 10.1 Implement comprehensive error handling

  - Add user-friendly error messages for all fund operations
  - Implement proper validation error display in forms
  - Add error recovery mechanisms for balance calculation failures
  - Implement graceful degradation when fund data is unavailable
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10.2 Add empty states and loading indicators
  - Create empty state for funds list when no funds exist
  - Add loading states for fund balance calculations
  - Implement loading indicators for fund dashboard charts
  - Add empty states for fund dashboard when no data is available
  - _Requirements: 7.6_
