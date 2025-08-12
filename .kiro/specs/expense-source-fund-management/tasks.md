# Implementation Plan

- [x] 1. Database schema migration and data population

  - Create database migration script to add source_fund_id column to expenses table
  - Implement migration logic to populate existing expenses with source fund data based on category relationships
  - Add database index for performance optimization on source_fund_id column
  - Create rollback script for migration reversal if needed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Update TypeScript interfaces and validation schemas

  - Modify Expense interface in types/funds.ts to include source_fund_id and source_fund_name fields
  - Update CreateExpenseSchema to make source_fund_id required
  - Update UpdateExpenseSchema to include optional source_fund_id field
  - Add new error messages for source fund validation
  - _Requirements: 1.5, 2.3, 3.5_

- [x] 3. Enhance expense API endpoints with source fund support
- [x] 3.1 Update expense creation endpoint (POST /api/expenses/route.ts)

  - Modify request validation to require source_fund_id
  - Add validation to ensure source fund is related to selected category
  - Update fund balance calculations to use source_fund_id instead of category fund
  - Update response to include source fund information from database joins
  - _Requirements: 1.1, 1.5_

- [x] 3.2 Update expense update endpoint (PUT /api/expenses/[id]/route.ts)

  - Add source_fund_id to update validation schema
  - Implement validation for source fund changes during editing
  - Update fund balance recalculation logic to handle source fund changes
  - Ensure proper fund balance reversal and reapplication when source fund changes
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.3 Update expense retrieval endpoint (GET /api/expenses/route.ts)

  - Modify database queries to include source fund information via joins
  - Update response format to include source_fund_name field
  - Ensure fund filtering continues to work with new source fund structure
  - _Requirements: 4.1, 4.2_

- [x] 4. Create source fund selection component

  - Implement SourceFundSelector component that shows funds related to selected category
  - Add validation logic to ensure selected source fund is valid for current category
  - Implement auto-selection logic when category has only one related fund
  - Add integration with existing fund filter for smart defaults
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.3_

- [x] 5. Update expense form with source fund functionality
- [x] 5.1 Enhance expense creation form in components/expenses-view.tsx

  - Add source fund dropdown to new expense form
  - Implement category change handler to update available source funds
  - Add form validation to require source fund selection
  - Integrate with existing fund filter to provide smart defaults
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.3, 4.4_

- [x] 5.2 Enhance expense editing form in components/expenses-view.tsx

  - Add source fund dropdown to edit expense dialog
  - Implement logic to show current source fund as selected
  - Handle source fund updates when category changes during editing
  - Add validation to prevent invalid source fund selections
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Update expense display with source fund information

  - Modify expense table to include source fund column
  - Add visual indicators to distinguish between source and destination funds
  - Implement transfer indicators when source and destination funds differ
  - Update expense list styling to accommodate new source fund information
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Update fund balance calculation logic

  - Modify fund balance calculations in API endpoints to use source_fund_id
  - Update fund recalculation endpoint to handle source fund changes
  - Update dashboard fund balance displays to reflect new calculation logic
  - Ensure fund transfer calculations work correctly with source fund tracking
  - _Requirements: 3.5, 2.1, 2.2_

- [x] 8. Create migration API endpoint

  - Implement POST /api/migrate-expense-source-funds endpoint
  - Add migration logic to populate source_fund_id for existing expenses
  - Include error handling and logging for migration issues
  - Add validation to ensure migration can be run safely
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Update budget context with source fund support

  - Modify addExpense function in budget context to accept source_fund_id parameter
  - Update updateExpense function to handle source fund changes
  - Ensure context state management works correctly with new source fund data
  - Update expense-related helper functions to work with source funds
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 10. Add comprehensive validation and error handling

  - Implement client-side validation for source fund selection
  - Add server-side validation for source fund and category relationships
  - Create user-friendly error messages for invalid source fund selections
  - Add error boundaries for source fund-related failures
  - _Requirements: 1.5, 2.3, 2.4_

- [x] 11. Create unit tests for source fund functionality

  - Write tests for updated expense API endpoints with source fund validation
  - Create tests for source fund selection component behavior
  - Add tests for migration logic with various data scenarios
  - Write tests for updated fund balance calculations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_
