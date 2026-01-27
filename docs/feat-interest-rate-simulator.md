# Feature: Interest Rate Simulator (Simulador de Tasas de Interés)

## Branch Name
`feat/interest-rate-simulator`

## Overview
Create a new simulator feature that allows users to input an interest rate, specify its type (EA - Efectiva Anual, E. Mensual - Efectiva Mensual, Nominal, etc.), and convert it to other rate types (EA, mensual, diario). Users can save multiple simulations and list them, following the same patterns established in the investment and loan simulators.

## User Stories
- As a user, I want to input an interest rate and specify what type it is (EA, Mensual, Nominal, etc.)
- As a user, I want to see the equivalent rates in other formats (EA, mensual, diario)
- As a user, I want to save my rate conversions for future reference
- As a user, I want to list and load my saved rate simulations

---

## Implementation Plan

### Phase 1: Foundation (Types & Calculations)

#### Task 1.1: Create Type Definitions
- [x] Create `/types/interest-rate-simulator.ts`
  - Define `RATE_TYPES` constant with supported rate types:
    - `EA` - Efectiva Anual (Annual Effective Rate)
    - `EM` - Efectiva Mensual (Monthly Effective Rate)
    - `ED` - Efectiva Diaria (Daily Effective Rate)
    - `NM` - Nominal Mensual (Monthly Nominal Rate)
    - `NA` - Nominal Anual (Annual Nominal Rate with compounding period)
  - Define `RateType` type
  - Define `InterestRateScenario` interface:
    ```typescript
    {
      id: string;
      name: string;
      inputRate: number;        // The rate entered by user
      inputRateType: RateType;  // Type of the input rate
      notes?: string;
      createdAt: string;
      updatedAt: string;
    }
    ```
  - Define `RateConversionResult` interface:
    ```typescript
    {
      ea: number;      // Efectiva Anual
      em: number;      // Efectiva Mensual
      ed: number;      // Efectiva Diaria
      nm: number;      // Nominal Mensual (12 períodos)
      na: number;      // Nominal Anual (12 períodos)
    }
    ```
  - Create Zod schemas for validation:
    - `CreateInterestRateScenarioSchema`
    - `UpdateInterestRateScenarioSchema`
  - Define error message constants
  - Add utility formatting functions

#### Task 1.2: Create Calculation Library
- [x] Create `/lib/interest-rate-calculations.ts`
  - Implement rate conversion formulas:
    ```typescript
    // EA to other rates
    function convertEAtoEM(ea: number): number  // (1+EA)^(1/12) - 1
    function convertEAtoED(ea: number): number  // (1+EA)^(1/365) - 1
    function convertEAtoNM(ea: number): number  // 12 * [(1+EA)^(1/12) - 1]
    function convertEAtoNA(ea: number, periods: number): number

    // EM to EA (and then to others)
    function convertEMtoEA(em: number): number  // (1+EM)^12 - 1

    // ED to EA
    function convertEDtoEA(ed: number): number  // (1+ED)^365 - 1

    // NM to EA (considering monthly compounding)
    function convertNMtoEA(nm: number): number  // (1 + nm/12)^12 - 1

    // NA to EA
    function convertNAtoEA(na: number, periods: number): number  // (1 + na/periods)^periods - 1

    // Main conversion function
    function convertRate(rate: number, fromType: RateType): RateConversionResult
    ```
  - Include proper rounding utilities (4-6 decimal places for rates)
  - Add validation for rate ranges (0-100% typically)

---

### Phase 2: Backend (API & Database)

#### Task 2.1: Create Migration Endpoint
- [x] Create `/app/api/migrate-interest-rate-simulator/route.ts`
  - POST handler to create tables:
    ```sql
    CREATE TABLE interest_rate_scenarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      input_rate DECIMAL(12, 8) NOT NULL,
      input_rate_type VARCHAR(10) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT interest_rate_scenarios_type_check
        CHECK (input_rate_type IN ('EA', 'EM', 'ED', 'NM', 'NA'))
    )
    ```
  - GET handler to check migration status
  - Idempotent implementation (safe to run multiple times)

#### Task 2.2: Create CRUD API Routes
- [x] Create `/app/api/interest-rate-scenarios/route.ts`
  - GET: List all scenarios with calculated conversions
  - POST: Create new scenario with Zod validation

- [x] Create `/app/api/interest-rate-scenarios/[id]/route.ts`
  - GET: Get single scenario by ID
  - PUT: Update scenario
  - DELETE: Delete scenario

---

### Phase 3: Frontend Components

#### Task 3.1: Create Component Structure
- [x] Create `/components/interest-rate-simulator/index.ts` (barrel export)

#### Task 3.2: Create Main Calculator Component
- [x] Create `/components/interest-rate-simulator/interest-rate-calculator.tsx`
  - Main container with tabs (Calculadora / Mis Simulaciones)
  - State management for form data and saved scenarios
  - Real-time calculation using useMemo
  - Handlers for save, load, delete operations

#### Task 3.3: Create Form Component
- [x] Create `/components/interest-rate-simulator/interest-rate-form.tsx`
  - Input field for rate (with +/- buttons for quick adjustment)
  - Dropdown to select input rate type (EA, EM, ED, NM, NA)
  - Help text explaining each rate type
  - Purple theme styling (consistent with other simulators)

#### Task 3.4: Create Results Display Component
- [x] Create `/components/interest-rate-simulator/interest-rate-results.tsx`
  - Display all converted rates in a clear format
  - Use Card components for each rate type
  - Show the formula used for conversion (educational)
  - Highlight which rate was the input
  - Color coding for easy identification

#### Task 3.5: Create Save Dialog Component
- [x] Create `/components/interest-rate-simulator/save-rate-dialog.tsx`
  - Dialog for naming and saving the scenario
  - Optional notes field
  - Support for both create and update modes

#### Task 3.6: Create Scenario List Component
- [x] Create `/components/interest-rate-simulator/interest-rate-scenario-list.tsx`
  - Table/list of saved scenarios
  - Show name, input rate, input type, date
  - Actions: Load, Delete
  - Empty state message

---

### Phase 4: Page & Navigation

#### Task 4.1: Create Page Route
- [x] Create `/app/simular-tasas/page.tsx`
  - Page metadata for SEO
  - Header with icon and description
  - Render InterestRateCalculator component

- [x] Create `/app/simular-tasas/[id]/page.tsx`
  - Dynamic route for viewing/editing saved scenarios
  - Fetch scenario data and pass to calculator

#### Task 4.2: Update Sidebar Navigation
- [x] Update `/components/app-sidebar.tsx`
  - Add new menu item for "Simular Tasas"
  - Use appropriate icon (Percent or Calculator)
  - Add to isActive() helper for route matching

---

### Phase 5: Testing & Documentation

#### Task 5.1: Manual Testing
- [x] Test all rate conversions with known values
- [x] Test CRUD operations (create, read, update, delete)
- [x] Test migration endpoint (run multiple times)
- [x] Test UI responsiveness on mobile/tablet/desktop
- [x] Test error states (validation, network errors)

#### Task 5.2: Update CLAUDE.md
- [x] Add documentation for Interest Rate Simulator feature
  - Describe rate types and formulas
  - Document API endpoints
  - Document component structure

---

## Technical Details

### Rate Conversion Formulas

| From | To EA | Formula |
|------|-------|---------|
| EA | EA | `ea` |
| EM | EA | `(1 + em)^12 - 1` |
| ED | EA | `(1 + ed)^365 - 1` |
| NM | EA | `(1 + nm/12)^12 - 1` |
| NA | EA | `(1 + na/n)^n - 1` (n = períodos) |

| From EA | To | Formula |
|---------|-----|---------|
| EA | EM | `(1 + ea)^(1/12) - 1` |
| EA | ED | `(1 + ea)^(1/365) - 1` |
| EA | NM | `12 * ((1 + ea)^(1/12) - 1)` |
| EA | NA | `n * ((1 + ea)^(1/n) - 1)` |

### File Structure Summary

```
/types/
  └── interest-rate-simulator.ts

/lib/
  └── interest-rate-calculations.ts

/components/interest-rate-simulator/
  ├── index.ts
  ├── interest-rate-calculator.tsx
  ├── interest-rate-form.tsx
  ├── interest-rate-results.tsx
  ├── save-rate-dialog.tsx
  └── interest-rate-scenario-list.tsx

/app/api/
  ├── migrate-interest-rate-simulator/
  │   └── route.ts
  └── interest-rate-scenarios/
      ├── route.ts
      └── [id]/
          └── route.ts

/app/simular-tasas/
  ├── page.tsx
  └── [id]/
      └── page.tsx
```

### Dependencies
- No new dependencies required
- Uses existing: Radix UI, Zod, Recharts, Lucide icons

### Estimated Complexity
- Types & Calculations: Low (pure functions, well-defined formulas)
- API Routes: Low (following established patterns)
- Components: Medium (new UI for rate display)
- Integration: Low (follows existing patterns)

---

## Progress Tracking

### Phase 1: Foundation
- [x] Task 1.1: Create Type Definitions
- [x] Task 1.2: Create Calculation Library

### Phase 2: Backend
- [x] Task 2.1: Create Migration Endpoint
- [x] Task 2.2: Create CRUD API Routes

### Phase 3: Frontend Components
- [x] Task 3.1: Create Component Structure
- [x] Task 3.2: Create Main Calculator Component
- [x] Task 3.3: Create Form Component
- [x] Task 3.4: Create Results Display Component
- [x] Task 3.5: Create Save Dialog Component
- [x] Task 3.6: Create Scenario List Component

### Phase 4: Page & Navigation
- [x] Task 4.1: Create Page Route
- [x] Task 4.2: Update Sidebar Navigation

### Phase 5: Testing & Documentation
- [x] Task 5.1: Manual Testing
- [x] Task 5.2: Update CLAUDE.md
