# Design Document

## Overview

This feature extends the estudios agrupadores administration interface to include payment method selection for each agrupador. Users will be able to specify which payment methods (cash, credit, debit) should be considered when calculating and displaying agrupador data in the dashboard. This provides granular control over financial analysis by allowing users to filter transactions based on payment methods per agrupador.

## Architecture

### Database Schema Changes

The `estudio_groupers` table will be extended with a new column to store selected payment methods:

```sql
ALTER TABLE estudio_groupers
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT NULL;

-- Add constraint to ensure only valid payment methods
ALTER TABLE estudio_groupers
ADD CONSTRAINT IF NOT EXISTS check_payment_methods
CHECK (
  payment_methods IS NULL OR
  (payment_methods <@ ARRAY['cash', 'credit', 'debit']::text[] AND array_length(payment_methods, 1) > 0)
);

-- Create index for faster filtering by payment methods
CREATE INDEX IF NOT EXISTS idx_estudio_groupers_payment_methods
ON estudio_groupers USING GIN(payment_methods);
```

### API Integration Points

1. **Estudios Groupers API** (`/api/estudios/[id]/groupers/[grouperId]`): Extended to handle payment method updates
2. **Dashboard Groupers API** (`/api/dashboard/groupers`): Modified to apply payment method filtering based on estudio configuration
3. **Estudios Groupers List API** (`/api/estudios/[id]/groupers`): Updated to include payment method data

## Components and Interfaces

### Frontend Components

#### PaymentMethodSelector Component

A new reusable component for selecting multiple payment methods:

```typescript
interface PaymentMethodSelectorProps {
  selectedMethods: string[];
  onSelectionChange: (methods: string[]) => void;
  disabled?: boolean;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
];
```

#### Enhanced Estudios Administration Form

The existing estudios administration page will be enhanced with:

- Payment method selector for each assigned agrupador
- Visual indicators showing selected payment methods
- Validation to ensure at least one method is selected or allow empty for "all methods"

### Backend API Extensions

#### Updated Estudio Groupers Response

```typescript
interface EstudioGrouperResponse {
  id: number;
  name: string;
  is_assigned?: boolean;
  percentage?: number;
  payment_methods?: string[]; // New field
}
```

#### Dashboard Groupers Query Enhancement

The dashboard API will be modified to:

1. Join with `estudio_groupers` when `estudioId` is provided
2. Apply payment method filtering based on agrupador configuration
3. Fall back to all payment methods when no specific methods are configured

## Data Models

### Database Schema Updates

```sql
-- Migration script for payment methods support
ALTER TABLE estudio_groupers
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT NULL;

ALTER TABLE estudio_groupers
ADD CONSTRAINT IF NOT EXISTS check_payment_methods
CHECK (
  payment_methods IS NULL OR
  (payment_methods <@ ARRAY['cash', 'credit', 'debit']::text[] AND array_length(payment_methods, 1) > 0)
);

CREATE INDEX IF NOT EXISTS idx_estudio_groupers_payment_methods
ON estudio_groupers USING GIN(payment_methods);

COMMENT ON COLUMN estudio_groupers.payment_methods IS 'Array of payment methods to include for this agrupador (cash, credit, debit). NULL means all methods.';
```

### API Data Flow

1. **Configuration Flow**: User selects payment methods → Frontend validates → API updates `estudio_groupers.payment_methods`
2. **Dashboard Flow**: Dashboard requests data → API queries with payment method filters → Filtered results returned

## Error Handling

### Validation Rules

- Payment methods array must contain only valid values: 'cash', 'credit', 'debit'
- Empty array is not allowed (use NULL for "all methods")
- At least one payment method must be selected if not using "all methods"

### Error Scenarios

1. **Invalid Payment Method**: Return 400 with descriptive error message
2. **Database Constraint Violation**: Handle gracefully with user-friendly message
3. **Missing Estudio/Grouper**: Return 404 with appropriate error
4. **Dashboard Query Failure**: Fallback to unfiltered data with warning

### Fallback Behavior

- If `payment_methods` is NULL or empty, include all payment methods
- If database query fails, log error and return unfiltered results
- If invalid payment methods are stored, filter them out and log warning

## Implementation Phases

### Phase 1: Database Schema and Backend API

1. Create database migration for payment methods column
2. Update estudio groupers API endpoints
3. Modify dashboard groupers API for filtering

### Phase 2: Frontend Components

1. Create PaymentMethodSelector component
2. Integrate selector into estudios administration form
3. Add visual indicators for configured payment methods

### Phase 3: Dashboard Integration

1. Update dashboard to use filtered data
2. Ensure compatibility with existing percentage calculations
3. Add error handling and fallback mechanisms
