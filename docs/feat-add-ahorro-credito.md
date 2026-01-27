# Plan: Split Savings Column into Efectivo and Crédito

## Overview

This plan details the implementation of splitting the current single "Ahorro Esperado" (Expected Savings) column into two separate columns:
- **Ahorro Efectivo** - Savings from cash payments
- **Ahorro Crédito** - Savings from credit payments

This change affects the simulation budget form table structure, calculations, validation, and database schema.

## Current State

- Single `expected_savings` column in `simulation_budgets` table
- Validation: `expected_savings <= efectivo_amount`
- Balance calculation: `net_spend = efectivo_amount - expected_savings`
- Total calculation: `total = efectivo + credito - expected_savings`

## Target State

- Two separate columns: `ahorro_efectivo_amount` and `ahorro_credito_amount`
- Validation: `ahorro_efectivo <= efectivo_amount` AND `ahorro_credito <= credito_amount`
- Balance calculation: Only efectivo savings affect balance (remain unchanged)
- Total calculations: Separate totals for efectivo and credito

---

## Implementation Plan

### [x] 1. Database Schema Changes

**Location**: New migration script `/scripts/add-ahorro-credito-migration.sql`

**Tasks**:
1. Create migration script to add two new columns:
   - `ahorro_efectivo_amount DECIMAL(10,2) DEFAULT 0 NOT NULL`
   - `ahorro_credito_amount DECIMAL(10,2) DEFAULT 0 NOT NULL`

2. Migrate existing `expected_savings` data to `ahorro_efectivo_amount` (assuming cash savings)

3. Add new constraints:
   - `check_ahorro_efectivo_valid`: `ahorro_efectivo_amount >= 0 AND ahorro_efectivo_amount <= efectivo_amount`
   - `check_ahorro_credito_valid`: `ahorro_credito_amount >= 0 AND ahorro_credito_amount <= credito_amount`

4. Create indexes for performance on new columns

5. Keep `expected_savings` column for backward compatibility (can be deprecated later)

6. Create verification and rollback scripts

**Migration API Endpoint**: Create `/api/migrate-ahorro-credito` to run the migration

---

### [x] 2. Type Definitions Update

**Location**: `/lib/simulation-validation.ts` and related type files

**Tasks**:
1. Update `SimulationBudgetSchema` in Zod:
   ```typescript
   export const SimulationBudgetSchema = z.object({
     category_id: z.union([z.number(), z.string().uuid()]),
     efectivo_amount: SimulationBudgetAmountSchema,
     credito_amount: SimulationBudgetAmountSchema,
     // New fields
     ahorro_efectivo_amount: SimulationBudgetAmountSchema.optional().default(0),
     ahorro_credito_amount: SimulationBudgetAmountSchema.optional().default(0),
     // Legacy - keep for backward compatibility
     expected_savings: SimulationBudgetAmountSchema.optional().default(0),
   }).refine(
     (data) => data.ahorro_efectivo_amount <= data.efectivo_amount,
     { message: "Ahorro efectivo no puede ser mayor al presupuesto en efectivo", path: ["ahorro_efectivo_amount"] }
   ).refine(
     (data) => data.ahorro_credito_amount <= data.credito_amount,
     { message: "Ahorro crédito no puede ser mayor al presupuesto en crédito", path: ["ahorro_credito_amount"] }
   );
   ```

2. Update `CategoryBudgetData` type in `/lib/subgroup-calculations.ts`:
   ```typescript
   export type CategoryBudgetData = {
     efectivo_amount: string | number;
     credito_amount: string | number;
     ahorro_efectivo_amount: string | number;
     ahorro_credito_amount: string | number;
     expected_savings?: string | number; // Optional for backward compatibility
   };
   ```

---

### [x] 3. API Endpoints Update

**Location**: `/app/api/simulations/[id]/budgets/route.ts`

**Tasks**:
1. Update GET query to include new columns:
   ```sql
   SELECT
     sb.category_id,
     c.name as category_name,
     sb.efectivo_amount,
     sb.credito_amount,
     sb.ahorro_efectivo_amount,
     sb.ahorro_credito_amount,
     sb.expected_savings,  -- For backward compatibility
     sb.created_at,
     sb.updated_at
   FROM simulation_budgets sb
   ...
   ```

2. Update PUT handler to process new fields:
   ```typescript
   const { category_id, efectivo_amount, credito_amount, ahorro_efectivo_amount = 0, ahorro_credito_amount = 0 } = budget;
   ```

3. Update INSERT/UPSERT statement to include new columns:
   ```sql
   INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, credito_amount, ahorro_efectivo_amount, ahorro_credito_amount, updated_at)
   VALUES (${simulationId}, ${category_id}, ${efectivo_amount}, ${credito_amount}, ${ahorro_efectivo_amount}, ${ahorro_credito_amount}, CURRENT_TIMESTAMP)
   ON CONFLICT (simulation_id, category_id)
   DO UPDATE SET
     efectivo_amount = EXCLUDED.efectivo_amount,
     credito_amount = EXCLUDED.credito_amount,
     ahorro_efectivo_amount = EXCLUDED.ahorro_efectivo_amount,
     ahorro_credito_amount = EXCLUDED.ahorro_credito_amount,
     updated_at = CURRENT_TIMESTAMP
   ```

---

### [x] 4. Subgroup Calculations Update

**Location**: `/lib/subgroup-calculations.ts`

**Tasks**:
1. Update `Subtotals` type:
   ```typescript
   export type Subtotals = {
     efectivoAmount: number;
     creditoAmount: number;
     ahorroEfectivoAmount: number;  // New
     ahorroCreditoAmount: number;   // New
     total: number;
   };
   ```

2. Update `calculateSubgroupSubtotals()` function:
   ```typescript
   export function calculateSubgroupSubtotals(
     subgroup: Subgroup,
     budgetData: Record<string, CategoryBudgetData>,
     visibilityState?: VisibilityState
   ): Subtotals {
     let efectivoAmount = 0;
     let creditoAmount = 0;
     let ahorroEfectivoAmount = 0;  // New
     let ahorroCreditoAmount = 0;   // New

     for (const categoryId of subgroup.categoryIds) {
       const categoryKey = String(categoryId);
       const data = budgetData[categoryKey];

       // Skip hidden categories
       if (visibilityState && !isVisible(...)) continue;

       if (data) {
         const efectivo = parseFloat(String(data.efectivo_amount)) || 0;
         const credito = parseFloat(String(data.credito_amount)) || 0;
         const ahorroEfectivo = parseFloat(String(data.ahorro_efectivo_amount)) || 0;  // New
         const ahorroCredito = parseFloat(String(data.ahorro_credito_amount)) || 0;   // New

         efectivoAmount += efectivo;
         creditoAmount += credito;
         ahorroEfectivoAmount += ahorroEfectivo;  // New
         ahorroCreditoAmount += ahorroCredito;    // New
       }
     }

     // Total = efectivo + credito - ahorro_efectivo - ahorro_credito
     const total = efectivoAmount + creditoAmount - ahorroEfectivoAmount - ahorroCreditoAmount;

     return {
       efectivoAmount,
       creditoAmount,
       ahorroEfectivoAmount,  // New
       ahorroCreditoAmount,   // New
       total,
     };
   }
   ```

---

### [x] 5. Subgroup Subtotal Row Component Update

**Location**: `/components/subgroup-subtotal-row.tsx`

**Tasks**:
1. Update props to include separate savings values:
   ```typescript
   interface SubgroupSubtotalRowProps {
     subgroupId: string;
     subtotals: Subtotals;
     subgroupBalance: number;
     isSubgroupVisible?: boolean;
   }
   ```

2. Update table cells to show two savings columns:
   ```tsx
   {/* Ahorro Efectivo Subtotal */}
   <TableCell className="text-right">
     <span className="font-semibold text-purple-600">
       {formatCurrency(subtotals.ahorroEfectivoAmount)}
     </span>
   </TableCell>

   {/* Ahorro Crédito Subtotal */}
   <TableCell className="text-right">
     <span className="font-semibold text-purple-600">
       {formatCurrency(subtotals.ahorroCreditoAmount)}
     </span>
   </TableCell>
   ```

---

### [x] 6. Simulation Budget Form - Table Header Update

**Location**: `/components/simulation-budget-form.tsx` (lines ~2090-2097)

**Tasks**:
1. Replace single "Ahorro Esperado" header with two headers:
   ```tsx
   <TableHead className="text-right w-1/7">Efectivo</TableHead>
   <TableHead className="text-right w-1/7">Crédito</TableHead>
   <TableHead className="text-right w-1/7">Ahorro Efectivo</TableHead>
   <TableHead className="text-right w-1/7">Ahorro Crédito</TableHead>
   <TableHead className="text-right w-1/7">Total</TableHead>
   <TableHead className="text-right w-1/7">Balance</TableHead>
   <TableHead className="w-8"></TableHead>
   ```

2. Update colSpan in empty state row from 9 to 10 (new column count)

---

### [x] 7. Simulation Budget Form - Category Row Update

**Location**: `/components/simulation-budget-form.tsx` (lines ~2410-2460)

**Tasks**:
1. Replace single expected_savings input with two separate inputs:
   ```tsx
   {/* Ahorro Efectivo Input */}
   <TableCell className="text-right">
     <div className="space-y-1">
       <Input
         type="number"
         min="0"
         step="0.01"
         max={parseFloat(categoryData?.efectivo_amount || "0")}
         value={categoryData?.ahorro_efectivo_amount || "0"}
         onChange={(e) => {
           handleInputChange(category.id, "ahorro_efectivo_amount", e.target.value);
         }}
         className={`w-full text-right ${
           categoryErrors?.ahorro_efectivo ? "border-destructive" :
           parseFloat(categoryData?.ahorro_efectivo_amount || "0") > 0 ? "text-purple-600 font-semibold" : ""
         }`}
       />
       {categoryErrors?.ahorro_efectivo && (
         <p className="text-xs text-destructive">{categoryErrors.ahorro_efectivo}</p>
       )}
     </div>
   </TableCell>

   {/* Ahorro Crédito Input */}
   <TableCell className="text-right">
     <div className="space-y-1">
       <Input
         type="number"
         min="0"
         step="0.01"
         max={parseFloat(categoryData?.credito_amount || "0")}
         value={categoryData?.ahorro_credito_amount || "0"}
         onChange={(e) => {
           handleInputChange(category.id, "ahorro_credito_amount", e.target.value);
         }}
         className={`w-full text-right ${
           categoryErrors?.ahorro_credito ? "border-destructive" :
           parseFloat(categoryData?.ahorro_credito_amount || "0") > 0 ? "text-purple-600 font-semibold" : ""
         }`}
       />
       {categoryErrors?.ahorro_credito && (
         <p className="text-xs text-destructive">{categoryErrors.ahorro_credito}</p>
       )}
     </div>
   </TableCell>
   ```

---

### [x] 8. Simulation Budget Form - Calculations Update

**Location**: `/components/simulation-budget-form.tsx`

**Tasks**:
1. Update `totals` calculation (lines ~1095-1114):
   ```typescript
   const totals = useMemo(() => {
     let totalEfectivo = 0;
     let totalCredito = 0;
     let totalAhorroEfectivo = 0;   // New
     let totalAhorroCredito = 0;    // New
     let totalGeneral = 0;

     Object.values(budgetData).forEach((data) => {
       const efectivo = parseFloat(data.efectivo_amount) || 0;
       const credito = parseFloat(data.credito_amount) || 0;
       const ahorroEfectivo = parseFloat(data.ahorro_efectivo_amount) || 0;  // New
       const ahorroCredito = parseFloat(data.ahorro_credito_amount) || 0;   // New

       totalEfectivo += efectivo;
       totalCredito += credito;
       totalAhorroEfectivo += ahorroEfectivo;  // New
       totalAhorroCredito += ahorroCredito;    // New
       totalGeneral += efectivo + credito - ahorroEfectivo - ahorroCredito;
     });

     const totalNetSpend = totalEfectivo - totalAhorroEfectivo;  // Only efectivo savings affect balance

     return {
       efectivo: totalEfectivo,
       credito: totalCredito,
       ahorroEfectivo: totalAhorroEfectivo,  // New
       ahorroCredito: totalAhorroCredito,    // New
       netSpend: totalNetSpend,
       general: totalGeneral,
     };
   }, [budgetData]);
   ```

2. Update `getCategoryTotal` function (lines ~1117-1125):
   ```typescript
   const getCategoryTotal = (categoryId: string | number): number => {
     const data = budgetData[String(categoryId)];
     if (!data) return 0;

     const efectivo = parseFloat(data.efectivo_amount) || 0;
     const credito = parseFloat(data.credito_amount) || 0;
     const ahorroEfectivo = parseFloat(data.ahorro_efectivo_amount) || 0;
     const ahorroCredito = parseFloat(data.ahorro_credito_amount) || 0;
     return efectivo + credito - ahorroEfectivo - ahorroCredito;
   };
   ```

3. Update `categoryBalances` calculation (lines ~1280-1282):
   ```typescript
   // Calculate net spend: Efectivo - Ahorro Efectivo (only efectivo savings affect balance)
   const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
   const ahorroEfectivo = parseFloat(categoryData.ahorro_efectivo_amount) || 0;
   const netSpend = efectivoAmount - ahorroEfectivo;  // Only efectivo savings
   ```

---

### [x] 9. Validation Update

**Location**: `/lib/simulation-validation.ts`

**Tasks**:
1. Update `validateBudgetFormData` function to validate both new fields:
   ```typescript
   export function validateBudgetFormData(formData: {
     [categoryId: string]: {
       efectivo_amount: string;
       credito_amount: string;
       ahorro_efectivo_amount?: string;  // New
       ahorro_credito_amount?: string;   // New
     };
   }): {
     isValid: boolean;
     errors: { [categoryId: string]: {
       efectivo?: string;
       credito?: string;
       ahorro_efectivo?: string;  // New
       ahorro_credito?: string;   // New
     } };
     totalErrors: number;
   } {
     // ... existing validation ...

     // Validate ahorro_efectivo_amount
     const ahorroEfectivo = data.ahorro_efectivo_amount ?? "0";
     const ahorroEfectivoValidation = validateBudgetAmountInput(ahorroEfectivo);
     if (!ahorroEfectivoValidation.isValid) {
       categoryErrors.ahorro_efectivo = ahorroEfectivoValidation.error;
       totalErrors++;
     } else if (ahorroEfectivoValidation.numericValue > efectivoValidation.numericValue) {
       categoryErrors.ahorro_efectivo = "El ahorro efectivo no puede ser mayor al presupuesto en efectivo";
       totalErrors++;
     }

     // Validate ahorro_credito_amount
     const ahorroCredito = data.ahorro_credito_amount ?? "0";
     const ahorroCreditoValidation = validateBudgetAmountInput(ahorroCredito);
     if (!ahorroCreditoValidation.isValid) {
       categoryErrors.ahorro_credito = ahorroCreditoValidation.error;
       totalErrors++;
     } else if (ahorroCreditoValidation.numericValue > creditoValidation.numericValue) {
       categoryErrors.ahorro_credito = "El ahorro crédito no puede ser mayor al presupuesto en crédito";
       totalErrors++;
     }
   }
   ```

---

### [x] 10. Copy/Clone Functionality Update

**Location**: `/app/api/simulations/[id]/copy/route.ts`

**Tasks**:
1. Update copy logic to include new columns when duplicating simulations
2. Ensure `ahorro_efectivo_amount` and `ahorro_credito_amount` are copied to new simulation

---

### [x] 11. Template Functionality Update

**Location**: `/app/api/simulations/[id]/save-as-template/route.ts` and related

**Tasks**:
1. Update template save/load to include new fields
2. Ensure templates preserve ahorro efectivo and ahorro credito values

---

### [x] 12. Excel Export Update

**Location**: `/app/api/simulations/[id]/export/route.ts`

**Tasks**:
1. Update Excel export to include two separate columns for savings
2. Replace "Ahorro Esperado" with "Ahorro Efectivo" and "Ahorro Crédito"

---

### [ ] 13. Testing (PENDING)

**Tasks**:
1. Create migration test to verify database changes
2. Test form validation with new fields
3. Test calculation logic with both savings types
4. Test subtotal calculations
5. Test balance calculations (verify only efectivo savings affect balance)
6. Test copy/clone functionality
7. Test template save/load
8. Test Excel export

---

### [x] 14. UI/UX Considerations

**Tasks**:
1. Ensure column widths are appropriate for new layout (6 columns now instead of 5)
2. Consider adding a small badge or indicator when either savings value > 0
3. Add tooltip or help text explaining the difference between efectivo and credito savings
4. Ensure mobile responsiveness with additional column

---

## Data Migration Strategy

### Phase 1: Add New Columns (Non-Breaking)
1. Add `ahorro_efectivo_amount` and `ahorro_credito_amount` columns
2. Migrate existing `expected_savings` → `ahorro_efectivo_amount`
3. Keep `expected_savings` column for backward compatibility
4. UI reads from new columns, writes to both

### Phase 2: Update UI and Validation
1. Update form to show two separate inputs
2. Update validation rules
3. Update calculations

### Phase 3: Cleanup (Optional)
1. Deprecate `expected_savings` column after verification
2. Remove backward compatibility code

---

## Rollback Plan

If issues arise, the rollback script should:
1. Drop new columns `ahorro_efectivo_amount` and `ahorro_credito_amount`
2. Restore `expected_savings` column functionality
3. Revert UI changes to single column display

---

## Success Criteria

- [x] Two separate savings columns visible in table
- [x] Validation prevents ahorro_efectivo > efectivo_amount
- [x] Validation prevents ahorro_credito > credito_amount
- [x] Balance calculation only considers efectivo savings
- [x] Total calculation considers both savings types
- [x] Subtotals display correctly with both savings
- [ ] All existing simulations migrate without data loss (pending migration execution)
- [x] Copy/clone functionality preserves new fields
- [x] Excel export includes both savings columns
- [x] No TypeScript errors in modified files
- [ ] All tests passing (pending)
