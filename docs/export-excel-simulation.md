# Export Excel Simulation - Implementation Plan

**Branch:** `export-excel-simulation`
**Feature:** Add Excel export functionality to simulation budget configuration view
**Date:** 2025-10-08

## Overview

Add an Excel export button to the simulation budget configuration page that exports:

1. **Total Ingresos** (Total Income) summary
2. **Presupuestos por Categoría** table with:
   - Category name
   - Efectivo amount
   - Crédito amount
   - Total per category
   - Running balance calculation

## Current State Analysis

- Simulation budget form displays income and budget data in `/app/simular/[id]/page.tsx`
- Component `SimulationBudgetForm` (`/components/simulation-budget-form.tsx`) renders the budget table
- Data is fetched from `/api/simulations/[id]/budgets`
- `xlsx` library (v0.18.5) is already installed in `package.json`
- Total income is stored in `simulation_incomes` table
- Budget data is stored in `simulation_budgets` table

## Implementation Tasks

### Phase 1: Backend API Endpoint

- [x] Create new API endpoint `/api/simulations/[id]/export`
  - [x] Fetch simulation details (id, name)
  - [x] Fetch total income from `simulation_incomes` table
  - [x] Fetch all budget data with category information
  - [x] Calculate totals (efectivo, credito, general)
  - [x] Calculate running balances per category
  - [x] Return structured data for Excel export

### Phase 2: Excel Export Utility

- [x] Create utility function `/lib/excel-export-utils.ts`
  - [x] Function to generate simulation Excel workbook
  - [x] Sheet 1: "Resumen" (Summary) with total income and totals
  - [x] Sheet 2: "Presupuestos" (Budgets) with detailed category breakdown
  - [x] Apply formatting (headers, currency, borders, column widths)
  - [x] Add formulas for totals and balances
  - [x] Generate downloadable file with simulation name

### Phase 3: Frontend Export Button

- [x] Add export button to `SimulationBudgetForm` component
  - [x] Add "Download" icon button in header or actions area
  - [x] Position near "Guardar Manualmente" button
  - [x] Show loading state during export
  - [x] Handle export errors with toast notifications
  - [x] Trigger file download with proper filename

### Phase 4: Export Functionality

- [x] Implement client-side export handler
  - [x] Call API endpoint to get export data
  - [x] Use xlsx library to generate workbook
  - [x] Create proper Excel structure:
    - **Resumen Sheet:**
      - Total Ingresos
      - Total Efectivo
      - Total Crédito
      - Total General
      - Number of categories with budget
    - **Presupuestos Sheet:**
      - Headers: Categoría | Efectivo | Crédito | Total | Balance
      - Data rows sorted by category name
      - Totals row at bottom
  - [x] Download file with name: `simulacion-{name}-{date}.xlsx`

### Phase 5: Styling & UX

- [x] Style export button to match existing design
- [x] Add button text: "Exportar a Excel"
- [x] Show success toast after download
- [x] Add error handling for:
  - Network failures
  - Empty simulation data
  - Browser compatibility issues
- [-] Test on different browsers

### Phase 6: Testing

- [-] Test with empty simulation (no budgets)
- [-] Test with partial data (some categories)
- [-] Test with complete data (all categories)
- [-] Test with large dataset (40+ categories)
- [-] Verify Excel file opens correctly in:
  - Microsoft Excel
  - Google Sheets
  - LibreOffice Calc
- [-] Verify calculations are correct
- [-] Verify formatting is preserved

## Technical Specifications

### API Endpoint Structure

```typescript
// GET /api/simulations/[id]/export
Response: {
  simulation: {
    id: number,
    name: string
  },
  totalIncome: number,
  budgets: Array<{
    category_id: string | number,
    category_name: string,
    fund_name?: string,
    efectivo_amount: number,
    credito_amount: number,
    total: number,
    balance: number
  }>,
  totals: {
    efectivo: number,
    credito: number,
    general: number
  },
  categoryCount: number
}
```

### Excel Structure

**Sheet 1: Resumen**
| Concepto | Valor |
|----------|-------|
| Simulación | {name} |
| Total Ingresos | ${totalIncome} |
| Total Efectivo | ${totals.efectivo} |
| Total Crédito | ${totals.credito} |
| Total General | ${totals.general} |
| Categorías con Presupuesto | {count} |

**Sheet 2: Presupuestos**
| Categoría | Fondo | Efectivo | Crédito | Total | Balance |
|-----------|-------|----------|---------|-------|---------|
| {name} | {fund} | ${amount} | ${amount} | ${total} | ${balance} |
| ... | ... | ... | ... | ... | ... |
| **TOTALES** | | **${total}** | **${total}** | **${total}\*\* | |

### Dependencies

- `xlsx` (^0.18.5) - Already installed ✓
- `@types/xlsx` (^0.0.35) - Already installed ✓
- `lucide-react` - For Download icon ✓

## File Changes

### New Files

- `/app/api/simulations/[id]/export/route.ts` - Export API endpoint
- `/lib/excel-export-utils.ts` - Excel generation utilities

### Modified Files

- `/components/simulation-budget-form.tsx` - Add export button and handler

## Success Criteria

1. ✓ Export button visible and accessible in simulation budget view
2. ✓ Clicking export downloads an Excel file
3. ✓ Excel file contains two sheets: Resumen and Presupuestos
4. ✓ All data matches what's displayed in the UI
5. ✓ Calculations (totals, balances) are correct
6. ✓ File opens correctly in major spreadsheet applications
7. ✓ Proper error handling and user feedback
8. ✓ Performance is acceptable (<2s for typical simulation)

## Notes

- Keep export functionality simple and focused on current view data
- Filename format: `simulacion-{name}-{timestamp}.xlsx`
- Consider adding export date/time to summary sheet
- Ensure currency formatting uses locale-appropriate symbols
- Balance calculation should match UI (running balance from top to bottom)
