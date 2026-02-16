# Fix: Persist Subgroups Implementation Analysis

**Branch**: fix/persist-subgroups
**Date**: 2026-01-13
**Issue**: Subgroups created in simulation form are not persisting across form reopen

## Problem Analysis

### Current State

1. **Database Tables**: ✅ Tables exist but schema was incomplete
   - `simulation_subgroups` table exists
   - `subgroup_categories` junction table exists
   - Data IS being saved to database (confirmed via SQL query)
   - **Missing columns**: `template_subgroup_id`, `custom_order`, `custom_visibility`

2. **API Endpoints**: ⚠️ API routes exist but were failing due to schema
   - `GET /api/simulations/[id]/subgroups` - Was failing with SQL error
   - `POST /api/simulations/[id]/subgroups` - Creates subgroups
   - Both endpoints use `ensureSubgroupTablesExist()` to ensure tables are available
   - **Issue**: The query in `getSubgroupsBySimulation()` selects columns that didn't exist

3. **Component Loading**: ✅ Component code is correct
   - `useEffect` at line 359-379 loads subgroups when `simulationId` changes
   - Code properly handles API responses
   - Error handling was suppressing the SQL error (no toast shown)

### Root Cause - IDENTIFIED ✅

**The actual issue**: Database schema mismatch

The code in `lib/subgroup-db-utils.ts` queries these columns:

- `sg.template_subgroup_id` - for linking subgroups from templates
- `sg.custom_order` - for storing custom sorting order (JSONB)
- `sg.custom_visibility` - for tracking visibility state (boolean)

However, the database table was missing these columns, causing the query to fail with:

```
Error: column sg.template_subgroup_id does not exist
```

The error was silently caught in the component's useEffect and no user feedback was shown.

## Investigation Tasks

### [ ] Task 1: Add Debug Logging

Add console.log statements to understand the flow:

- Log `simulationId` when component mounts
- Log API request URL in useEffect
- Log API response data structure
- Log any errors in the catch block

### [ ] Task 2: Test API Endpoint Directly

Test the API endpoint manually to verify it returns correct data:

- Call `/api/simulations/14/subgroups` directly
- Verify the response structure
- Check if `data.subgroups` contains the expected data

### [ ] Task 3: Verify simulationId Prop

Check how simulationId is passed to the component:

- Find where SimulationBudgetForm is instantiated
- Verify the prop is always defined
- Check if there's any conditional rendering

### [ ] Task 4: Check Component Lifecycle

Verify component mounting/unmounting behavior:

- Check if component unmounts when dialog closes
- Verify if state is properly reset
- Check if useEffect cleanup is needed

## Implementation Plan

### [x] Step 1: Identify the Root Cause ✅

**Investigation performed**:

- Tested API endpoint directly: `/api/simulations/14/subgroups`
- Found SQL error: `column sg.template_subgroup_id does not exist`
- Verified database schema was missing 3 columns
- Confirmed subgroup data exists in database

### [x] Step 2: Fix Database Schema ✅

**Action taken**:

- Added missing columns to `simulation_subgroups` table:
  - `template_subgroup_id UUID` - for template relationships
  - `custom_order JSONB` - for storing custom sorting order
  - `custom_visibility BOOLEAN DEFAULT TRUE` - for visibility tracking

**SQL Migration**:

```sql
ALTER TABLE simulation_subgroups
ADD COLUMN IF NOT EXISTS template_subgroup_id UUID,
ADD COLUMN IF NOT EXISTS custom_order JSONB,
ADD COLUMN IF NOT EXISTS custom_visibility BOOLEAN DEFAULT TRUE;
```

### [x] Step 3: Verify API Functionality ✅

**Test results**:

- API endpoint now returns data successfully
- Response structure is correct:
  ```json
  {
    "success": true,
    "subgroups": [{
      "id": "ed3d57a1-5559-44d1-868c-859377ca6010",
      "simulationId": 14,
      "name": "GOD first",
      "displayOrder": 0,
      "categoryIds": ["31cefea4-128c-444d-84a2-a91f358bebc3", ...],
      "templateSubgroupId": null,
      "customOrder": null,
      "customVisibility": true
    }],
    "statusCode": 200
  }
  ```

### [x] Step 4: Update ensureSubgroupTablesExist() ✅

**Changes made**:

- Updated `lib/subgroup-db-utils.ts` to include new columns in table creation
- Added migration logic using PostgreSQL DO block to add missing columns
- This ensures the function works for both new and existing databases
- Prevents this issue from occurring in future deployments

**Code added**:

```sql
DO $$
BEGIN
  -- Add template_subgroup_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_subgroups'
    AND column_name = 'template_subgroup_id'
  ) THEN
    ALTER TABLE simulation_subgroups ADD COLUMN template_subgroup_id UUID;
  END IF;
  -- ... (similar for custom_order and custom_visibility)
END $$;
```

### [x] Step 5: Verify Fix ✅

**What was fixed**:

1. Database schema now includes all required columns
2. API endpoint returns data successfully
3. Component useEffect will now receive valid subgroup data
4. Subgroups will persist across form close/reopen

**How to verify in browser**:

1. Open simulation form for "2026 cut expenses" (ID: 14)
2. The "GOD first" subgroup should now appear automatically
3. Close and reopen the form - subgroup should still be there
4. Create a new subgroup - it should persist after reopening

### [ ] Step 6: Optional Future Improvements

**Recommendations**:

- Add user-visible error toast when subgroups fail to load (currently silent)
- Create migration API endpoint for easy schema updates
- Add integration tests for subgroup persistence
- Document schema changes in migration changelog

## Testing Checklist

### [x] Test Case 1: Database Schema ✅

1. ✅ Verified `simulation_subgroups` table exists
2. ✅ Confirmed missing columns were identified
3. ✅ Added columns: `template_subgroup_id`, `custom_order`, `custom_visibility`
4. ✅ Verified data integrity after schema update

### [x] Test Case 2: API Response ✅

1. ✅ Tested endpoint: `/api/simulations/14/subgroups`
2. ✅ Verified response contains the "GOD first" subgroup
3. ✅ Confirmed response structure matches expected format
4. ✅ Status code 200 returned successfully

### [ ] Test Case 3: UI Loading (Manual Test Required)

1. Open simulation form (e.g., "2026 cut expenses")
2. **Expected**: "GOD first" subgroup should appear immediately
3. Verify the 2 categories are shown in the subgroup
4. Close and reopen form - subgroup should still be there

### [ ] Test Case 4: Create New Subgroup (Manual Test Required)

1. Create a new subgroup with categories
2. Verify subgroup appears in the form
3. Close and reopen form
4. **Expected**: Both old and new subgroups appear
5. Verify order is preserved

## Success Criteria

- [x] Database schema includes all required columns ✅
- [x] API endpoint returns subgroup data successfully ✅
- [x] No SQL errors in API responses ✅
- [x] Code updated to prevent future schema issues ✅
- [ ] Subgroups load immediately when simulation form opens (requires manual test)
- [ ] Subgroups persist across form close/reopen (requires manual test)
- [ ] All existing functionality continues to work (requires manual test)

## Summary

### Issue Identified

The subgroups were being saved to the database correctly, but the API was failing to retrieve them due to a **database schema mismatch**. The code was querying columns (`template_subgroup_id`, `custom_order`, `custom_visibility`) that didn't exist in the database.

### Solution Implemented

1. **Added missing columns** to the `simulation_subgroups` table via SQL migration
2. **Updated `ensureSubgroupTablesExist()`** function to automatically add these columns for existing databases
3. **Verified API functionality** - endpoint now returns subgroup data successfully

### Files Modified

- `lib/subgroup-db-utils.ts` - Updated table creation and migration logic
- `docs/fix-persist-subgroups.md` - Complete documentation of analysis and fix

### Database Changes

```sql
ALTER TABLE simulation_subgroups
ADD COLUMN IF NOT EXISTS template_subgroup_id UUID,
ADD COLUMN IF NOT EXISTS custom_order JSONB,
ADD COLUMN IF NOT EXISTS custom_visibility BOOLEAN DEFAULT TRUE;
```

### Additional Issue Found & Fixed

While testing, discovered another missing table issue:

- **Error**: `relation "simulation_applied_templates" does not exist`
- **Cause**: Template-related tables were not created in the database
- **Solution**: Ran migration endpoint `/api/migrate-subgroup-templates`
- **Tables Created**:
  - `subgroup_templates` - Store template definitions
  - `template_subgroups` - Store subgroup templates
  - `simulation_applied_templates` - Track which templates are applied to simulations

**Migration command**:

```bash
curl -X POST http://localhost:3000/api/migrate-subgroup-templates
```

### Next Steps

Both fixes are complete and all APIs are working:

1. ✅ Subgroups API - Fixed by adding missing columns
2. ✅ Templates API - Fixed by running migration to create tables
3. Open the simulation form in the browser - no console errors should appear
4. Confirm the "GOD first" subgroup loads automatically
5. Test creating new subgroups and reopening the form

The root causes were database schema issues that caused APIs to fail silently.
