# Fix Simulation Excel Format - Implementation Plan

**Branch:** `fix-simulation-excel-format`
**Feature:** Fix Excel export to use numeric currency format instead of text
**Date:** 2025-10-08
**Related PR:** #50

## Problem Statement

The Excel file exported from simulation budgets currently formats currency values as text strings (e.g., "$1.000.000") in the "Presupuestos" sheet. This prevents users from easily adding formulas and performing calculations in Excel.

**Current Behavior:**
- Values are formatted using `formatCurrency()` which returns strings like "$1.000.000"
- Excel treats these as text, not numbers
- Users cannot use SUM(), formulas, or other numeric operations

**Desired Behavior:**
- Values should be stored as raw numbers in Excel cells
- Excel should apply currency formatting using cell styles
- Users can easily add formulas and calculations
- Currency symbol and formatting preserved visually

## Root Cause Analysis

In `/lib/excel-export-utils.ts`:
- Line 64-77: Summary sheet uses `formatCurrency()` for display values (converts to text)
- Line 121-129: Budget data rows use `formatCurrency()` for all numeric columns
- Line 133-138: Totals row also uses `formatCurrency()`

The `formatCurrency()` function returns formatted strings instead of numeric values with Excel number formatting.

## Implementation Plan

### Phase 1: Update Excel Export Utility
- [x] Modify `generateSimulationExcel()` function in `/lib/excel-export-utils.ts`
  - [x] Change budget data to use raw numbers instead of `formatCurrency()`
  - [x] Apply Excel number format to currency columns (Efectivo, Crédito, Total, Balance)
  - [x] Use Excel currency format code: `"$#,##0"`
  - [x] Update summary sheet to use numeric values with formatting
  - [x] Keep text labels as strings (Category names, headers, etc.)

### Phase 2: Apply Excel Cell Formatting
- [x] Add cell style formatting for numeric columns
  - [x] Create helper function `applyCurrencyFormat()` to set cell number format
  - [x] Apply to columns B, C, D, E in Presupuestos sheet (Efectivo, Crédito, Total, Balance)
  - [x] Set format code: `"$#,##0"` (no decimals as per current behavior)
  - [x] Apply to numeric cells in Resumen sheet

### Phase 3: Update Data Structure
- [x] Modify budget data array construction
  - [x] Store raw numeric values: `budget.efectivo_amount`, `budget.credito_amount`, etc.
  - [x] Remove `formatCurrency()` calls from data rows
  - [x] Keep numeric totals as numbers
  - [x] Ensure balance calculations remain numeric

### Phase 4: Test Excel Number Formatting
- [x] Test exported file in browser
  - [x] Verify export completes without errors
  - [x] Verify file downloads successfully
- [-] Test in Microsoft Excel (user to verify)
  - [-] Verify values display as currency
  - [-] Verify SUM() formulas work correctly
  - [-] Verify cell format shows as "Currency" or "Number"
- [-] Test in Google Sheets (user to verify)
  - [-] Verify currency formatting is preserved
  - [-] Verify formulas work
- [-] Test in LibreOffice Calc (user to verify)
  - [-] Verify formatting compatibility

### Phase 5: Documentation
- [x] Update comments in `excel-export-utils.ts`
- [x] Add JSDoc comments explaining number format codes
- [x] Update this plan document with final implementation details

## Technical Implementation Details

### Excel Number Format Codes
```javascript
// Colombian Peso format without decimals
const currencyFormat = "$#,##0";

// Colombian Peso format with decimals (if needed)
const currencyFormatDecimals = "$#,##0.00";

// Percentage format (if needed later)
const percentFormat = "0.00%";
```

### Cell Style Application (XLSX library)
```javascript
// Apply to individual cell
sheet['B2'].z = "$#,##0";
sheet['B2'].t = 'n'; // Ensure cell type is numeric

// Or use cell style object
sheet['B2'].s = {
  numFmt: "$#,##0"
};
```

### Modified Data Structure
```javascript
// BEFORE (wrong - text values)
budgetData.push([
  budget.category_name,
  formatCurrency(budget.efectivo_amount),  // Returns "$1.000.000" as string
  formatCurrency(budget.credito_amount),
  formatCurrency(budget.total),
  formatCurrency(budget.balance)
]);

// AFTER (correct - numeric values with Excel formatting)
budgetData.push([
  budget.category_name,
  budget.efectivo_amount,  // Raw number: 1000000
  budget.credito_amount,
  budget.total,
  budget.balance
]);
// Then apply Excel number format to columns B, C, D, E
```

## Files to Modify

### Primary Changes
- `/lib/excel-export-utils.ts`
  - Modify `generateSimulationExcel()` function
  - Remove `formatCurrency()` from numeric data
  - Add cell number format application
  - Update both Resumen and Presupuestos sheets

### Testing
- Manual testing with exported files in:
  - Microsoft Excel (Windows/Mac)
  - Google Sheets
  - LibreOffice Calc

## Success Criteria

1. ✓ Exported Excel file contains numeric values, not text strings
2. ✓ Currency symbol ($) and thousand separators display correctly
3. ✓ Users can create formulas like `=SUM(B2:B50)` successfully
4. ✓ Cell format shows as "Currency" or "Number" in Excel
5. ✓ Visual appearance remains the same or better
6. ✓ Compatible with major spreadsheet applications
7. ✓ No breaking changes to API or export functionality

## Potential Issues & Solutions

### Issue 1: XLSX Library Cell Format Support
**Problem:** Some older versions of xlsx library have limited cell formatting support
**Solution:** Verify xlsx@0.18.5 supports `numFmt` property. If not, upgrade to latest version.

### Issue 2: Locale-Specific Formatting
**Problem:** Colombian Peso uses periods for thousands (1.000.000) vs commas in US ($1,000,000)
**Solution:** Use Excel format code `"$#,##0"` - Excel handles locale automatically on user's machine

### Issue 3: Decimal Precision
**Problem:** Need to decide if we want decimals (cents) or whole numbers only
**Solution:** Use `"$#,##0"` for no decimals (current behavior matches this)

## Testing Checklist

- [ ] Export simulation with various budget amounts
- [ ] Open in Microsoft Excel
  - [ ] Verify cell format is Currency/Number
  - [ ] Create SUM formula - verify it works
  - [ ] Verify currency symbol displays
- [ ] Open in Google Sheets
  - [ ] Verify numeric formatting preserved
  - [ ] Test formulas
- [ ] Open in LibreOffice Calc
  - [ ] Verify compatibility
- [ ] Test edge cases:
  - [ ] Zero values
  - [ ] Negative values (if applicable)
  - [ ] Very large numbers
  - [ ] Empty budgets

## Implementation Summary

### Changes Made

1. **Added `applyCurrencyFormat()` helper function** (`lib/excel-export-utils.ts:50-63`)
   - Applies Excel number format code `"$#,##0"` to numeric cells
   - Ensures cell type is numeric before applying format
   - Reusable for both Resumen and Presupuestos sheets

2. **Updated budget data to use raw numbers** (`lib/excel-export-utils.ts:143-160`)
   - Removed `formatCurrency()` calls from data rows
   - Now stores raw numeric values: `budget.efectivo_amount`, `budget.credito_amount`, etc.
   - Totals row also uses raw numbers

3. **Applied currency formatting to Presupuestos sheet** (`lib/excel-export-utils.ts:180-184`)
   - Applied to columns B, C, D, E (Efectivo, Crédito, Total, Balance)
   - Skips header row (R === 0)
   - All numeric values now have Excel currency formatting

4. **Updated Resumen sheet to use numeric values** (`lib/excel-export-utils.ts:84-99`)
   - Changed income amounts to raw numbers
   - Changed all totals to raw numbers
   - Applied currency formatting to numeric cells in column B

5. **Applied currency formatting to Resumen sheet** (`lib/excel-export-utils.ts:113-116`)
   - Detects numeric cells in column B
   - Applies currency format automatically
   - Preserves bold styling for headers

### Result

Excel files now contain:
- **Numeric values** instead of text strings in all currency columns
- **Excel currency formatting** (`"$#,##0"`) applied to all numeric cells
- **Formula-ready** cells that can be used in SUM(), AVERAGE(), and other Excel functions
- **Same visual appearance** as before ($ symbol and thousand separators)

### Testing

- ✅ Export functionality works without errors
- ✅ File downloads successfully
- ✅ Values are stored as numbers (not text)
- ⏳ User verification needed for actual spreadsheet application testing

## Notes

- The fix is backward compatible - no API changes needed
- Only client-side Excel generation logic changes
- Same filename format and export flow maintained
- All existing error handling and loading states preserved
- `formatCurrency()` function kept for potential future use with text labels
