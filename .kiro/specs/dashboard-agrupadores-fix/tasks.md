# Implementation Plan

- [x] 1. Fix main groupers API endpoint database query
  - Update SQL query in `/app/api/dashboard/groupers/route.ts` to use `expenses` table instead of `transactions`
  - Correct the JOIN sequence to properly connect groupers → grouper_categories → categories → expenses
  - Ensure parameterized queries handle payment method filtering correctly
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 2. Verify and fix grouper categories API endpoint
  - Review SQL query in `/app/api/dashboard/groupers/[id]/categories/route.ts` for consistency
  - Ensure proper JOIN between grouper_categories and categories tables
  - Verify payment method filtering works correctly in category breakdown
  - \_Requirements: 1.3, 3.1, 3.2, 3.4_pg
