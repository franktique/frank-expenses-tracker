# Fix: Reference Error - Cannot access 'getSubgroupForCategory' before initialization

**Issue**: When clicking on a simulation record to open its details, the following error occurred:
```
Error: Cannot access 'getSubgroupForCategory' before initialization
components/simulation-budget-form.tsx (1182:15) @ SimulationBudgetForm.useMemo[categoryBalances]
```

## Root Cause

The `getSubgroupForCategory` function was being called inside the `categoryBalances` useMemo hook (around line 1182), but the function definition was located much later in the component (around line 1298).

In JavaScript/React, when a function is defined normally (not as a const arrow function), it can be hoisted, but when used inside a useMemo hook with specific dependencies, the initialization order matters.

## Solution

**Moved the function definition to before the useMemo hooks that use it:**

### Before (Broken):
```
Line 1137: const categoryBalances = useMemo(() => {
Line 1182:   getSubgroupForCategory(subgroups, category.id) // ❌ Not defined yet!
...
Line 1298: const getSubgroupForCategory = (...) // Definition comes too late
```

### After (Fixed):
```
Line 1138: const getSubgroupForCategory = (...) // Define first
Line 1147: const categoryBalances = useMemo(() => {
Line 1193:   getSubgroupForCategory(subgroups, category.id) // ✅ Now defined!
```

## Changes Made

1. **Moved function definition** from line 1298 to line 1138 (right after `getSortedCategories` memo)
2. **Removed duplicate definition** that existed further down in the component
3. **Kept function as regular function** (not useCallback) since it has no external dependencies and is only used internally

## Files Modified

- `/components/simulation-budget-form.tsx` - Function repositioning only, no logic changes

## Verification

✅ Build compiles successfully with no TypeScript errors
✅ No functional logic changes - only initialization order fixed
✅ Function is now available before all useMemo hooks that reference it

## Testing

This fix allows users to:
1. Click on a simulation record to open its details ✅
2. The visibility toggle feature works with correct parent subgroup detection ✅
3. Balance calculations properly exclude hidden categories ✅
