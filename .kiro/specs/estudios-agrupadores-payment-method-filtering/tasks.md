# Implementation Plan

- [x] 1. Create database migration for payment methods support
  - Create SQL migration script to add payment_methods column to estudio_groupers table
  - Add constraint validation for payment method values
  - Create GIN index for efficient array querying
  - Add column comment for documentation
  - _Requirements: 1.2, 1.4_

- [x] 2. Create API route for payment methods migration
  - Implement `/api/migrate-estudio-grouper-payment-methods/route.ts` endpoint
  - Add error handling and rollback capabilities
  - Include validation for existing data integrity
  - Add logging for migration progress
  - _Requirements: 1.2_

- [x] 3. Create PaymentMethodSelector component
  - Implement reusable component for selecting multiple payment methods
  - Add checkbox interface for cash, credit, and debit options
  - Include "All Methods" option that clears specific selections
  - Add proper TypeScript interfaces and validation
  - Write unit tests for component behavior
  - _Requirements: 3.1, 3.3_

- [x] 4. Update estudio groupers API to handle payment methods
  - Modify GET `/api/estudios/[id]/groupers/route.ts` to include payment_methods in response
  - Update PUT `/api/estudios/[id]/groupers/[grouperId]/route.ts` to handle payment method updates
  - Add validation for payment method array format
  - Include error handling for invalid payment method values
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 5. Enhance estudios administration form with payment method selection
  - Integrate PaymentMethodSelector component into existing estudios page
  - Add payment method column to the assigned groupers table
  - Implement save functionality for payment method changes
  - Add visual feedback for unsaved changes
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 6. Update dashboard groupers API for payment method filtering
  - Modify `/api/dashboard/groupers/route.ts` to join with estudio_groupers when estudioId provided
  - Implement payment method filtering logic in SQL queries
  - Add fallback behavior when payment_methods is NULL (include all methods)
  - Ensure compatibility with existing percentage calculations
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 7. Add payment method filtering to expense queries
  - Update SQL queries to filter expenses based on agrupador payment method configuration
  - Implement proper JOIN logic between groupers, estudio_groupers, and expenses
  - Add array containment checks for payment method filtering
  - Test query performance with various payment method combinations
  - _Requirements: 2.1, 2.2, 4.3_

- [x] 8. Update TypeScript interfaces and types
  - Add payment_methods field to existing EstudioGrouperResponse interface
  - Create PaymentMethod type definition
  - Update dashboard API response types to reflect filtered data
  - Add proper type validation for payment method arrays
  - _Requirements: 1.2, 2.1, 3.1_

- [x] 9. Add visual indicators for configured payment methods
  - Display selected payment methods in the estudios administration table
  - Add badges or icons to show which payment methods are configured
  - Implement clear indication when "all methods" is selected (no specific configuration)
  - Add tooltips or help text to explain payment method filtering
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Implement error handling and validation
  - Add client-side validation for payment method selection
  - Implement server-side validation with descriptive error messages
  - Add graceful fallback when payment method configuration is invalid
  - Include proper error boundaries for payment method components
  - _Requirements: 1.4, 3.2_
