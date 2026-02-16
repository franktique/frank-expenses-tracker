# Implementation Plan

- [x] 1. Create database schema and migration
  - Create the `category_fund_relationships` table with proper indexes and constraints
  - Write migration script to transfer existing `categories.fund_id` data to the new relationship table
  - Add database validation functions for relationship integrity
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 2. Implement core API endpoints for category-fund relationships
  - Create GET `/api/categories/[id]/funds` endpoint to retrieve funds for a category
  - Create POST `/api/categories/[id]/funds` endpoint to update category-fund relationships
  - Create DELETE `/api/categories/[id]/funds/[fund_id]` endpoint with validation
  - Add proper error handling and validation for all new endpoints
  - _Requirements: 1.1, 1.2, 4.1, 4.3_

- [x] 3. Modify existing category API endpoints
  - Update GET `/api/categories` to include `associated_funds` array while maintaining backward compatibility
  - Update GET `/api/categories/[id]` to include associated funds information
  - Modify POST `/api/categories` to accept `fund_ids` array parameter
  - Update PUT `/api/categories/[id]` to handle multiple fund relationships
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 4. Create MultiFundSelector component
  - Implement reusable multi-select component for fund selection
  - Add proper TypeScript interfaces and props validation
  - Include search/filter functionality for large fund lists
  - Add visual indicators for selected funds (badges/chips)
  - _Requirements: 1.1, 5.3_

- [x] 5. Update CategoriesView component for multiple fund relationships
  - Replace single fund selector with MultiFundSelector component
  - Update category table to display multiple funds as badges
  - Modify add/edit dialogs to handle multiple fund selection
  - Add validation before deleting category-fund relationships
  - _Requirements: 1.1, 1.2, 4.4, 5.1, 5.2_

- [x] 6. Implement dynamic fund filtering logic in ExpensesView
  - Create function to get available funds based on selected category
  - Implement default fund selection logic (filter fund → first available → fallback)
  - Update expense form to dynamically filter fund dropdown based on category selection
  - Add real-time updates when category changes in the form
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 7. Update expense form fund selection behavior
  - Modify fund dropdown to show only funds related to selected category
  - Implement automatic fund preselection based on current fund filter
  - Add fallback logic when no specific funds are associated with category
  - Update form validation to ensure selected fund is valid for category
  - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 3.3_

- [x] 8. Add data validation and error handling
  - Implement validation to prevent deletion of relationships with existing expenses
  - Add warning dialogs when attempting to remove relationships with data
  - Create proper error messages for invalid fund-category combinations
  - Add loading states and error boundaries for relationship operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Update budget context and data fetching
  - Modify budget context to handle category-fund relationships
  - Update data fetching functions to include associated funds
  - Add caching for frequently accessed relationship data
  - Ensure proper state management for relationship updates
  - _Requirements: 1.3, 1.4, 5.4_

-
- [x] 10. Implement backward compatibility and migration
  - Ensure existing single fund relationships continue to work
  - Add migration utility to convert existing data to new format
  - Create fallback logic for categories without specific fund relationships
  - _Requirements: 1.4, 4.4, 5.4_

- [x] 11. Add visual indicators and user feedback
  - Update category list to clearly show associated funds
  - Add visual cues in expense form for fund selection constraints
  - Implement proper loading states during relationship updates
  - Create informative messages for users about fund-category relationships
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
