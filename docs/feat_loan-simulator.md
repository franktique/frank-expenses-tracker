# Loan Simulator Feature Implementation Plan

## Branch: `feat/loan-simulator`

## Overview

Create a comprehensive loan simulator that allows users to:

1. Calculate monthly payments for loans with principal amount, EA (Effective Annual) interest rate, and term
2. View payment breakdowns differentiating between interest and capital
3. Compare multiple interest rate scenarios side-by-side
4. View detailed payment schedules from start date to final payment
5. Simulate extra payments and see their impact on remaining payments and final payment date

## Feature Requirements

### Main Calculator View

- Input fields:
  - Loan amount (principal)
  - EA interest rate (annual effective rate)
  - Loan term in months
  - Start date (for payment schedule)
- Display:
  - Monthly payment amount
  - Total interest paid
  - Total payment (principal + interest)
  - Payment breakdown per month (interest vs capital)

### Interest Rate Comparison

- Ability to add multiple interest rate scenarios
- Display comparison columns showing:
  - Different monthly payment amounts
  - Total interest for each rate
  - Side-by-side comparison table

### Payment Schedule Tab

- Detailed amortization table showing:
  - Payment number
  - Payment date
  - Total payment amount
  - Principal portion
  - Interest portion
  - Remaining balance
- Extra payment simulation:
  - Add extra payments at specific payment numbers
  - See recalculated schedule
  - View updated final payment date
  - Show interest saved

## Implementation Plan

### Phase 1: Database Schema & Types

- [x] Create loan simulator types in `/types/loan-simulator.ts`
- [x] Create database migration API endpoint `/api/migrate-loan-simulator`
- [x] Design tables:
  - `loan_scenarios` - Store loan configurations
  - `loan_extra_payments` - Store extra payment simulations

### Phase 2: Core Calculation Utilities

- [x] Create `/lib/loan-calculations.ts` with:
  - `calculateMonthlyPayment()` - PMT formula
  - `generateAmortizationSchedule()` - Full payment schedule
  - `calculateExtraPaymentImpact()` - Recalculate with extra payments
  - `compareInterestRates()` - Generate comparison data

### Phase 3: API Routes

- [x] Create `/app/api/loan-scenarios/route.ts` - CRUD for loan scenarios
- [x] Create `/app/api/loan-scenarios/[id]/route.ts` - Individual scenario operations
- [x] Create `/app/api/loan-scenarios/[id]/schedule/route.ts` - Payment schedule generation
- [x] Create `/app/api/loan-scenarios/[id]/extra-payments/route.ts` - Extra payments CRUD

### Phase 4: UI Components

- [x] Create `/components/loan-simulator/loan-calculator-form.tsx` - Main form
- [x] Create `/components/loan-simulator/loan-summary-cards.tsx` - KPI display
- [x] Create `/components/loan-simulator/interest-rate-comparison.tsx` - Rate comparison
- [x] Create `/components/loan-simulator/payment-schedule-table.tsx` - Amortization table
- [x] Create `/components/loan-simulator/extra-payment-dialog.tsx` - Add extra payment
- [x] Create `/components/loan-simulator/loan-projection-chart.tsx` - Visual chart

### Phase 5: Pages & Routing

- [x] Create `/app/simular-prestamos/page.tsx` - List of loan simulations
- [x] Create `/app/simular-prestamos/[id]/page.tsx` - Main calculator with tabs
- [x] Create `/app/simular-prestamos/[id]/schedule/page.tsx` - Detailed schedule (optional separate route)

### Phase 6: Sidebar Integration

- [x] Add "Simular Préstamos" menu item to `/components/app-sidebar.tsx`
- [x] Use appropriate icon (e.g., `Calculator` or `Landmark` from lucide-react)

### Phase 7: Testing & Polish

- [x] Add form validation with Zod schemas
- [x] Test calculation accuracy
- [x] Add loading states and error handling
- [x] Implement responsive design
- [x] Add toast notifications for user feedback

## Technical Specifications

### Data Models

```typescript
// /types/loan-simulator.ts
export type LoanScenario = {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // EA (Effective Annual) rate
  termMonths: number;
  startDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
};

export type AmortizationPayment = {
  paymentNumber: number;
  date: string;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  isExtraPayment?: boolean;
  extraAmount?: number;
};

export type ExtraPayment = {
  id: string;
  loanScenarioId: string;
  paymentNumber: number;
  amount: number;
  description?: string;
  createdAt: string;
};

export type LoanComparison = {
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
};

export type LoanSummary = {
  monthlyPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  payoffDate: string;
};
```

### Calculation Formulas

**Monthly Payment (PMT):**

```
M = P * [r(1 + r)^n] / [(1 + r)^n - 1]

Where:
M = Monthly payment
P = Principal (loan amount)
r = Monthly interest rate (EA rate converted to monthly)
n = Total number of payments (term in months)
```

**Monthly Interest Rate from EA:**

```
monthlyRate = (1 + EA)^(1/12) - 1
```

**Amortization Schedule:**
For each payment:

- Interest portion = Remaining balance \* monthlyRate
- Principal portion = Monthly payment - Interest portion
- Remaining balance = Previous balance - Principal portion

### API Endpoints

#### `POST /api/loan-scenarios`

Create a new loan scenario

**Request:**

```json
{
  "name": "Home Loan 2024",
  "principal": 500000,
  "interestRate": 8.5,
  "termMonths": 360,
  "startDate": "2024-02-01"
}
```

**Response:** `LoanScenario`

#### `GET /api/loan-scenarios/[id]/schedule`

Generate payment schedule

**Query Parameters:**

- `includeExtraPayments` (boolean) - Include extra payments in calculation

**Response:**

```json
{
  "summary": { "monthlyPayment": 3845, "totalInterest": 884200, ... },
  "payments": [{ "paymentNumber": 1, "date": "2024-02-01", ... }],
  "extraPayments": [{ "paymentNumber": 12, "amount": 10000, ... }]
}
```

#### `POST /api/loan-scenarios/[id]/extra-payments`

Add an extra payment

**Request:**

```json
{
  "paymentNumber": 12,
  "amount": 10000,
  "description": "Annual bonus payment"
}
```

### Component Structure

```
/components/loan-simulator/
├── loan-calculator-form.tsx       # Main input form
├── loan-summary-cards.tsx         # KPI cards (monthly payment, total interest, etc.)
├── interest-rate-comparison.tsx   # Compare multiple rates side-by-side
├── payment-schedule-table.tsx     # Detailed amortization table
├── extra-payment-dialog.tsx       # Modal to add extra payments
├── loan-projection-chart.tsx      # Recharts visualization
└── index.ts                       # Barrel exports
```

### Page Structure

```
/app/simular-prestamos/
├── page.tsx                       # List view of all loan scenarios
└── [id]/
    ├── page.tsx                   # Main calculator with two tabs
    └── schedule/
        └── page.tsx               # (Optional) Separate page for detailed schedule
```

## Design Mockups

### Tab 1: Calculator

```
+----------------------------------------------------------+
|  Simular Préstamo: Home Loan 2024        [Save] [Delete] |
+----------------------------------------------------------+
|  Loan Amount      | [500,000]                             |
|  Interest Rate (EA) | [8.5]%                             |
|  Term (months)   | [360]                                 |
|  Start Date      | [2024-02-01]                          |
+----------------------------------------------------------+
|  [+ Add Rate Comparison]                                    |
+----------------------------------------------------------+
|  SUMMARY                          | COMPARISON              |
|  Monthly Payment: $3,845.53      | 8.5%    | 9.0%   | 10% |
|  Total Interest: $884,199.12     | $3,845 | $4,023 | $4,388|
|  Total Payment: $1,384,199.12    | $884K  | $948K  | $1.08M|
|  Payoff Date: January 2054       |                                |
+----------------------------------------------------------+
|  [View Payment Schedule Tab →]                            |
+----------------------------------------------------------+
```

### Tab 2: Payment Schedule

```
+----------------------------------------------------------+
|  Payment Schedule - Home Loan 2024                        |
+----------------------------------------------------------+
|  [+ Add Extra Payment] [Export] [Print]                   |
+----------------------------------------------------------+
|  Extra Payments Applied:                                  |
|  • Payment #12: $10,000 (Annual bonus) [-]               |
+----------------------------------------------------------+
|  # | Date       | Payment | Principal | Interest | Balance |
|-----------------------------------------------------------|
|  1 | Feb 2024   | $3,845  | $287      | $3,558   | $499,713|
|  2 | Mar 2024   | $3,845  | $289      | $3,556   | $499,424|
|  ...                                                       |
|  12| Jan 2025   | $13,845 | $10,290   | $3,555   | $488,322| ←
|  ...                                                       |
|  357| Dec 2053  | $3,845  | $3,801   | $44      | $3,820  |
|  358| Jan 2054  | $3,841  | $3,820   | $21      | $0      |
+----------------------------------------------------------+
|  Summary with Extra Payments:                              |
|  • Original payoff: January 2054                         |
|  • New payoff date: March 2052 (22 months early!)        |
|  • Interest saved: $82,450                               |
+----------------------------------------------------------+
```

## Integration Points

### Existing Patterns to Follow

1. **Simulation System** - Use similar CRUD patterns as `/app/simular/[id]`
2. **Dashboard Tabs** - Use Radix UI Tabs like in simulation pages
3. **Chart Components** - Use Recharts patterns from existing dashboards
4. **Form Validation** - Use Zod schemas like in other forms
5. **API Design** - Follow RESTful patterns from `/api/simulations/`
6. **Error Handling** - Use toast notifications and error boundaries
7. **localStorage** - Persist unsaved changes locally

### Dependencies

- **Existing**: `@neondatabase/serverless`, `zod`, `recharts`, `radix-ui`
- **Components**: Reuse existing UI components from `/components/ui/`
- **Utilities**: Use `/lib/db.ts` for database connections

## Migration Strategy

### Database Tables

```sql
-- Loan scenarios table
CREATE TABLE loan_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  principal DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  term_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extra payments table
CREATE TABLE loan_extra_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_scenario_id UUID NOT NULL REFERENCES loan_scenarios(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_extra_payments_scenario ON loan_extra_payments(loan_scenario_id);
```

## Timeline Considerations

- No timeline estimates provided
- Implementation will proceed incrementally
- Each phase will be marked complete in this document

## Notes

- EA (Effective Annual) rate requires conversion to monthly rate for calculations
- Extra payments should reduce principal and recalculate future interest
- Payment schedule should adjust dynamically when extra payments are added
- Consider adding "What-if" scenarios without saving to database
- All calculations are client-side possible; database only stores configurations

---

**Status**: Implementation Complete ✓
**Last Updated**: 2026-01-16
**Branch**: `feat/loan-simulator`
