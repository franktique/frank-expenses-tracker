# Implementation Plan

- [x] 1. Create utility function for category styling logic

  - Write `getCategoryNameStyle` function that determines CSS classes based on expense data
  - Handle edge cases for null, undefined, and negative values
  - Return appropriate Tailwind CSS classes for active/inactive states
  - _Requirements: 1.1, 1.4, 2.1_

- [x] 2. Implement conditional styling in dashboard table

  - Modify the category name TableCell in DashboardView component
  - Apply the utility function to determine styling classes
  - Ensure styling integrates with existing table structure and background colors
  - _Requirements: 1.1, 1.2, 3.1_
