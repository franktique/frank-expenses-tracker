# Implementation Plan: Pending Expense Toggle Feature

## Overview
Add a "Pending" toggle to the expense form that allows users to record expenses as pending. Pending expenses should appear in the main dashboard table with a purple background color in the category cell, distinguishing them from confirmed expenses.

## Requirements
1. Add a toggle button "Pending" to the expense form (deactivated by default)
2. When activated, record expense as pending
3. Display pending expenses in main dashboard table
4. Show purple background in category cell for pending expenses (vs green/others)

## Current State Analysis

### Expense Form Component
- **File**: `components/expense-form-dialog.tsx`
- Current structure has all standard fields but no pending toggle
- Uses React state with validation
- Calls `addExpense()` from BudgetContext

### Dashboard Table Component
- **File**: `components/dashboard-view.tsx`
- Categories currently have green background based on budget remaining
- Uses `getCategoryNameStyle()` utility for styling
- Shows aggregated expense data by category

### Expense Data Model
- **File**: `types/funds.ts`
- Current Expense interface (lines 307-352) lacks pending field
- Need to add `pending?: boolean` field

### API Structure
- Dashboard API aggregates expenses by category
- No distinction between pending and confirmed expenses
- Need updates to handle pending status

## Implementation Tasks

### Phase 1: Data Model & Database

#### Task 1: Database Schema Update
- [ ] Add `pending BOOLEAN DEFAULT FALSE` column to expenses table
- [ ] Create migration endpoint for schema update

#### Task 2: Type Definitions
- [ ] Update Expense interface to include `pending?: boolean`
- [ ] Update related validation schemas

### Phase 2: Backend API Updates

#### Task 3: Create Migration Endpoint
- [ ] Add `/api/migrate-pending-expense` endpoint
- [ ] Include rollback capability and validation

#### Task 4: Update Expense API
- [ ] Modify expense creation endpoint to handle pending field
- [ ] Update expense listing endpoints to include pending status

#### Task 5: Update Dashboard API
- [ ] Modify dashboard aggregation to separate pending/confirmed
- [ ] Ensure pending excluded from budget calculations
- [ ] Return pending/confirmed breakdown to frontend

### Phase 3: Frontend Implementation

#### Task 6: Expense Form Update
- [ ] Add pending toggle to `expense-form-dialog.tsx`
- [ ] Integrate with form state and validation
- [ ] Ensure toggle is deactivated by default

#### Task 7: Dashboard Table Updates
- [ ] Update `dashboard-view.tsx` to handle pending status
- [ ] Add purple background styling for pending categories
- [ ] Update `getCategoryNameStyle()` utility

#### Task 8: Category Styling Utility
- [ ] Modify `lib/category-styling.ts` to support pending status
- [ ] Add purple color scheme for pending items

### Phase 4: Testing & Validation

#### Task 9: Integration Testing
- [ ] Test expense creation with pending toggle
- [ ] Verify dashboard display with purple background
- [ ] Confirm pending excluded from budget calculations
- [ ] Test migration endpoint on existing databases

## Design Decisions

### Visual Design
- **Pending Color**: Purple background (`bg-purple-100 dark:bg-purple-950/50`)
- **Confirmed Colors**: Keep existing green/red budget-based colors
- **Toggle UI**: Standard toggle switch, labeled "Pendiente"

### Data Handling
- **Default Value**: `pending = false` for backward compatibility
- **Budget Calculations**: Pending expenses excluded from budget remaining
- **Aggregation**: Dashboard shows both pending and confirmed separately

### Migration Strategy
- **Backward Compatible**: Existing expenses have `pending = false`
- **Incremental**: Can deploy without breaking existing functionality
- **Rollback**: Include migration rollback capability

## Files to Modify

### New Files
- `docs/feat-add-pending-toggle.md` (this file)

### Modified Files
1. `types/funds.ts` - Add pending field to Expense interface
2. `app/api/expenses/route.ts` - Handle pending in expense creation
3. `app/api/dashboard/route.ts` - Separate pending/confirmed aggregation
4. `app/api/migrate-pending-expense/route.ts` - New migration endpoint
5. `components/expense-form-dialog.tsx` - Add pending toggle
6. `components/dashboard-view.tsx` - Update table styling
7. `lib/category-styling.ts` - Add purple color scheme
8. `context/budget-context.tsx` - Update addExpense to accept pending

## Implementation Status: ✅ COMPLETED

### Completed Tasks
- [x] Database schema updated with pending column
- [x] Migration endpoint created and tested
- [x] Expense interface updated with pending field
- [x] Expense form dialog updated with pending toggle
- [x] AddExpense API endpoint updated to handle pending
- [x] Dashboard API updated to separate pending/confirmed
- [x] Dashboard table styling updated with purple background
- [x] All integration tests passed

### Testing Results
- [x] Create pending expense via form - **PASSED**
- [x] Verify purple background in dashboard - **PASSED**
- [x] Confirm pending excluded from budget calculations - **PASSED**
- [x] Test with quick-add feature - **PASSED**
- [x] Verify migration works on existing data - **PASSED**
- [x] Validate form validation works with pending - **PASSED**

### Final Implementation Details

#### Database Changes
- Added `pending BOOLEAN DEFAULT FALSE` column to expenses table
- Backward compatible: existing expenses have `pending = false`
- Index created for better performance

#### API Changes
- `/api/expenses` POST endpoint accepts `pending` field
- `/api/dashboard` excludes pending from total calculations
- Dashboard API returns `confirmed_amount` and `pending_amount` fields
- Migration endpoint: `/api/migrate-pending-expense`

#### Frontend Changes
- Added toggle switch in expense form dialog
- Dashboard shows purple background (`bg-purple-100 dark:bg-purple-950/50`) for categories with pending expenses
- Pending expenses appear in dashboard but excluded from budget remaining calculations
- Form validation works correctly with pending toggle

#### User Experience
- Pending toggle is deactivated by default
- Clear labeling: "Pendiente" with description text
- Visual distinction: Purple background for pending categories
- Quick-add feature supports pending status

## Timeline: **COMPLETED in ~4 hours**

## Branch Naming
- Feature branch: `feat/add-pending-toggle` (current branch)

## Notes
- Implementation should be backward compatible
- Existing data migration should set all expenses as confirmed (pending=false)
- Consider adding pending toggle to expense edit/delete operations
- Future enhancement: Bulk approve pending expenses