# Implementation Plan

- [x] 1. Create database schema and migration

  - Create SQL migration script for credit_cards table with proper constraints including is_active field
  - Add credit_card_id column to expenses table with foreign key relationship
  - Create database indexes for performance optimization
  - Write migration API endpoint to execute schema changes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 5.4_

- [x] 2. Define TypeScript interfaces and validation schemas

  - Create CreditCard interface with all required properties including is_active field
  - Define CreditCardFranchise enum with supported card networks
  - Implement Zod validation schemas for create/update operations including status updates
  - Extend existing Expense interface to include credit card fields
  - Add credit card error message constants
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 5.3_

- [x] 3. Implement credit cards API endpoints

  - Create GET /api/credit-cards endpoint to list all credit cards with active status
  - Create POST /api/credit-cards endpoint to create new credit cards (active by default)
  - Create PUT /api/credit-cards/[id] endpoint to update existing credit cards including status changes
  - Create DELETE /api/credit-cards/[id] endpoint to delete credit cards
  - Add proper error handling and validation to all endpoints
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 4.2, 4.6_

- [x] 4. Extend expenses API to support credit card associations

  - Modify POST /api/expenses endpoint to accept optional credit_card_id
  - Modify PUT /api/expenses/[id] endpoint to update credit card associations
  - Update GET /api/expenses endpoint to include credit card information in joins
  - Ensure backward compatibility with existing expense data
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.3_

- [x] 5. Create credit cards management page and components

  - Create /app/tarjetas-credito/page.tsx for credit card management
  - Implement CreditCardsView component with CRUD operations
  - Create credit card creation/editing modal dialogs
  - Add credit card deletion confirmation dialog
  - Implement proper form validation and error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 6. Create reusable CreditCardSelector component

  - Implement dropdown component for selecting credit cards in forms
  - Display only active cards in format "Bank - Franchise \*\*\*\*1234"
  - When editing expenses, show currently selected card even if inactive with visual indicator
  - Include "No card selected" option for optional selection
  - Add loading states and error handling
  - Make component reusable across different forms
  - _Requirements: 2.1, 2.2, 2.3, 4.3, 4.4_

- [x] 7. Integrate credit card selector into expense forms

  - Add CreditCardSelector to expense creation dialog in ExpensesView
  - Add CreditCardSelector to expense editing dialog in ExpensesView
  - Position selector at the end of expense forms as specified
  - Ensure proper form state management and validation
  - Maintain existing expense form functionality
  - _Requirements: 2.1, 2.2, 4.3_

- [x] 8. Update expense display to show credit card information

  - Add credit card column to expenses table in ExpensesView
  - Display credit card info in format "Bank \*\*\*\*1234" when present
  - Show visual indicator for inactive credit cards (grayed out, "Inactive" badge)
  - Show empty state when no credit card is associated
  - Ensure responsive design for mobile devices
  - _Requirements: 3.1, 3.2, 4.5_

- [x] 9. Add credit card filtering to expense lists

  - Extend expense filtering to include credit card selection
  - Add credit card filter dropdown to ExpensesView including both active and inactive cards
  - Implement filter logic in expense list display
  - Update filter state management and URL parameters
  - _Requirements: 3.3, 4.7_

- [x] 10. Update CSV export to include credit card data

  - Modify CSV export functionality to include credit card information
  - Add credit card columns to exported data including active status
  - Handle cases where credit card data is not available
  - Ensure proper CSV formatting and encoding
  - _Requirements: 3.2, 4.8_

- [x] 11. Add credit cards navigation menu item

  - Add "Tarjetas de Crédito" menu item to app sidebar
  - Use CreditCard icon from Lucide React
  - Position appropriately in navigation hierarchy
  - Ensure proper routing and active state handling
  - _Requirements: 4.1_

- [x] 12. Update budget context to include credit cards

  - Add credit cards state management to BudgetContext
  - Implement CRUD functions for credit cards in context
  - Add credit card data fetching to refreshData function
  - Ensure proper error handling and loading states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.2_

- [x] 13. Implement active/inactive status management in credit cards view

  - Add status column to credit cards table showing active/inactive badges
  - Implement toggle buttons or switches to change card status
  - Add visual indicators to distinguish active from inactive cards
  - Update card status through API calls with proper error handling
  - Ensure status changes are reflected immediately in the UI
  - credit card selector into expense forms should only show active cards when creating/editing
  - _Requirements: 4.1, 4.2, 4.6_
