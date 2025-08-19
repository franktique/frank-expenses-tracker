# TypeScript Types Documentation

## Overview

This directory contains TypeScript type definitions for the Budget Tracker application, organized by feature area.

## Files

### `estudios.ts`

Contains type definitions for estudios (studies) and payment method filtering functionality:

- **PaymentMethod**: Enum type for payment methods (`cash`, `credit`, `debit`)
- **EstudioGrouperResponse**: Interface for grouper responses with payment method support
- **UpdateEstudioGrouperRequest**: Interface for updating grouper percentage and payment methods
- **DashboardGrouperResult**: Interface for dashboard API responses with filtering metadata
- Validation schemas using Zod
- Utility functions for payment method validation
- Error message constants

### `dashboard.ts`

Contains type definitions for dashboard functionality:

- **BudgetSummaryItem**: Budget and expense data with split payment method columns
- **DashboardData**: Complete dashboard data structure
- **DashboardGrouperResult**: Enhanced with payment method filtering support
- **PaymentMethodFilter**: Configuration for payment method filtering
- Utility functions for budget calculations and validation

### `funds.ts`

Contains type definitions for fund management:

- Re-exports PaymentMethod types from `estudios.ts` for backward compatibility
- **Fund**: Fund entity interface
- **Expense**: Enhanced with source fund support
- **Income**: Enhanced with fund support
- **Category**: Enhanced with multiple fund relationships
- Validation schemas and error messages

### `batch-category-api.ts`

Contains type definitions for batch category operations.

## Payment Method Integration

The payment method filtering feature introduces several key types:

### Core Types

```typescript
// Payment method enum
type PaymentMethod = "cash" | "credit" | "debit";

// Grouper response with payment method filtering
interface EstudioGrouperResponse {
  id: number;
  name: string;
  is_assigned?: boolean;
  percentage?: number;
  payment_methods?: PaymentMethod[] | null; // null = all methods
}

// Update request for grouper configuration
interface UpdateEstudioGrouperRequest {
  percentage?: number | null;
  payment_methods?: PaymentMethod[] | null;
}
```

### Dashboard Integration

```typescript
// Enhanced dashboard result with filtering metadata
interface DashboardGrouperResult {
  grouper_id: number;
  grouper_name: string;
  total_amount: string;
  budget_amount?: string;
  payment_methods_applied?: PaymentMethod[] | null;
}

// Response with filtering context
interface DashboardGroupersResponse {
  data: DashboardGrouperResult[];
  metadata: {
    estudio_id?: number;
    period_id: string;
    payment_method_filtering_applied: boolean;
    projection_mode: boolean;
    includes_budgets: boolean;
    total_groupers: number;
    filtered_groupers: number;
  };
}
```

## Validation

All types include Zod validation schemas for runtime type checking:

```typescript
// Payment method array validation
const PaymentMethodsArraySchema = z
  .array(PaymentMethodEnum)
  .min(1, "Debe seleccionar al menos un método de pago")
  .refine(
    (methods) => new Set(methods).size === methods.length,
    "No se permiten métodos de pago duplicados"
  )
  .nullable();
```

## Utility Functions

### Payment Method Validation

```typescript
// Check if a string is a valid payment method
function isValidPaymentMethod(method: string): method is PaymentMethod;

// Validate payment method arrays
function validatePaymentMethods(
  methods: unknown
): methods is PaymentMethod[] | null;

// Check if grouper has payment method filtering configured
function hasPaymentMethodFiltering(grouper: EstudioGrouperResponse): boolean;
```

### Dashboard Utilities

```typescript
// Check if payment method filtering is active
function hasPaymentMethodFiltering(filter: PaymentMethodFilter): boolean;
```

## Constants

```typescript
// Valid payment method values
const VALID_PAYMENT_METHODS: PaymentMethod[] = ["cash", "credit", "debit"];

// Spanish labels for payment methods
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  credit: "Crédito",
  debit: "Débito",
};
```

## Error Messages

Comprehensive error message constants are provided for consistent error handling:

```typescript
const ESTUDIO_ERROR_MESSAGES = {
  INVALID_PAYMENT_METHODS: "Los métodos de pago deben ser un array válido",
  EMPTY_PAYMENT_METHODS_ARRAY:
    "El array de métodos de pago no puede estar vacío. Use null para incluir todos los métodos",
  DUPLICATE_PAYMENT_METHODS: "No se permiten métodos de pago duplicados",
  // ... more error messages
} as const;
```

## Testing

All types include comprehensive test coverage in the `__tests__` directory:

- `estudios.test.ts`: Tests for estudios types and validation
- `dashboard.test.ts`: Tests for dashboard types and utilities
- `type-integration.test.ts`: Integration tests for cross-module compatibility

## Usage Examples

### API Route Implementation

```typescript
import {
  EstudioGrouperResponse,
  UpdateEstudioGrouperRequestSchema,
  validatePaymentMethods,
} from "@/types/estudios";

export async function PUT(request: Request) {
  const body = await request.json();
  const validatedData = UpdateEstudioGrouperRequestSchema.parse(body);

  if (
    validatedData.payment_methods &&
    !validatePaymentMethods(validatedData.payment_methods)
  ) {
    return NextResponse.json(
      { error: "Invalid payment methods" },
      { status: 400 }
    );
  }

  // ... implementation
}
```

### Component Usage

```typescript
import { PaymentMethod, PAYMENT_METHOD_LABELS } from "@/types/estudios";

interface PaymentMethodSelectorProps {
  selectedMethods: PaymentMethod[];
  onSelectionChange: (methods: PaymentMethod[]) => void;
}

export function PaymentMethodSelector({
  selectedMethods,
  onSelectionChange,
}: PaymentMethodSelectorProps) {
  // ... component implementation
}
```

## Migration Notes

- PaymentMethod types are now centralized in `estudios.ts` and re-exported from `funds.ts` for backward compatibility
- All existing code using PaymentMethod from `funds.ts` will continue to work without changes
- New payment method filtering functionality should import from `estudios.ts`
- Dashboard types have been enhanced with payment method filtering support while maintaining backward compatibility
