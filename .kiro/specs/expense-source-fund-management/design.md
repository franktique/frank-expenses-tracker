# Design Document

## Overview

This feature extends the expense management system to support source fund tracking alongside the existing destination fund functionality. Currently, expenses only track where money goes (destination fund) but not where it comes from. This enhancement adds a `source_fund_id` column to track the originating fund, enabling complete fund transfer tracking and better expense categorization.

The design maintains backward compatibility with existing data while providing enhanced fund management capabilities for users who need to track money movement between funds.

## Architecture

### Database Schema Changes

#### New Column Addition

```sql
ALTER TABLE expenses ADD COLUMN source_fund_id UUID REFERENCES funds(id);
CREATE INDEX IF NOT EXISTS idx_expenses_source_fund_id ON expenses(source_fund_id);
```

#### Updated Expense Table Structure

```sql
-- Current structure (conceptual)
expenses (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),
  period_id UUID REFERENCES periods(id),
  date DATE,
  event VARCHAR(255),
  payment_method VARCHAR(20),
  description VARCHAR(500),
  amount DECIMAL(10,2),
  destination_fund_id UUID REFERENCES funds(id), -- existing
  source_fund_id UUID REFERENCES funds(id)       -- new
)
```

### Data Migration Strategy

#### Migration Logic

1. **Identify Source Fund**: For each existing expense, determine the source fund based on the category's fund relationships
2. **Handle Multi-Fund Categories**: If a category has multiple associated funds, use the first available fund as default
3. **Handle Legacy Categories**: For categories using the old `fund_id` field, use that as the source fund
4. **Error Handling**: Log expenses that cannot be migrated due to missing fund relationships

#### Migration SQL

```sql
-- Update expenses with source fund based on category relationships
UPDATE expenses
SET source_fund_id = (
  SELECT COALESCE(
    -- Try to get from category_fund_relationships first
    (SELECT cfr.fund_id
     FROM category_fund_relationships cfr
     WHERE cfr.category_id = expenses.category_id
     LIMIT 1),
    -- Fallback to legacy fund_id
    (SELECT c.fund_id
     FROM categories c
     WHERE c.id = expenses.category_id)
  )
)
WHERE source_fund_id IS NULL;
```

## Components and Interfaces

### Frontend Components

#### Enhanced Expense Form

- **Source Fund Dropdown**: New dropdown showing funds related to selected category
- **Fund Validation**: Real-time validation ensuring source fund is valid for category
- **Visual Indicators**: Clear labeling to distinguish source vs destination funds
- **Auto-selection Logic**: Smart defaults based on fund filter and category relationships

#### Updated Expense List

- **Source Fund Display**: Show source fund information in expense table
- **Transfer Indicators**: Visual cues when source ≠ destination (fund transfers)
- **Filter Integration**: Maintain existing fund filter functionality

### API Enhancements

#### Expense Creation Endpoint

```typescript
// POST /api/expenses
interface CreateExpenseRequest {
  category_id: string;
  period_id: string;
  date: string;
  event?: string;
  payment_method: PaymentMethod;
  description: string;
  amount: number;
  source_fund_id: string; // new required field
  destination_fund_id?: string; // existing optional field
}
```

#### Expense Update Endpoint

```typescript
// PUT /api/expenses/[id]
interface UpdateExpenseRequest {
  category_id?: string;
  date?: string;
  event?: string;
  payment_method?: PaymentMethod;
  description?: string;
  amount?: number;
  source_fund_id?: string; // new optional field
  destination_fund_id?: string; // existing optional field
}
```

#### Enhanced Response Format

```typescript
interface ExpenseResponse {
  id: string;
  category_id: string;
  period_id: string;
  date: string;
  event?: string;
  payment_method: PaymentMethod;
  description: string;
  amount: number;
  source_fund_id: string; // new field
  source_fund_name: string; // new field (from join)
  destination_fund_id?: string; // existing field
  destination_fund_name?: string; // existing field (from join)
  // ... other existing fields
}
```

## Data Models

### Updated TypeScript Interfaces

#### Enhanced Expense Interface

```typescript
export interface Expense {
  id: string;
  category_id: string;
  period_id: string;
  date: string;
  event?: string;
  payment_method: PaymentMethod;
  description: string;
  amount: number;
  source_fund_id: string; // new required field
  source_fund_name?: string; // new field (populated in joins)
  destination_fund_id?: string; // existing optional field
  destination_fund_name?: string; // existing field
}
```

#### Updated Validation Schemas

```typescript
// Enhanced creation schema
export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid(),
  period_id: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  payment_method: PaymentMethodEnum,
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
  source_fund_id: z.string().uuid(), // new required field
  destination_fund_id: z.string().uuid().optional(),
});

// Enhanced update schema
export const UpdateExpenseSchema = z.object({
  category_id: z.string().uuid().optional(),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida')
    .optional(),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  payment_method: PaymentMethodEnum.optional(),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  amount: z.number().positive('El monto debe ser positivo').optional(),
  source_fund_id: z.string().uuid().optional(), // new optional field
  destination_fund_id: z.string().uuid().optional(),
});
```

### Fund Balance Calculation Updates

#### Enhanced Balance Logic

```typescript
// Updated fund balance calculation to include source fund tracking
current_balance = initial_balance
                + sum(incomes where fund_id = fund.id)
                + sum(expenses where destination_fund_id = fund.id)  // money coming in
                - sum(expenses where source_fund_id = fund.id)       // money going out
```

## Error Handling

### Validation Rules

#### Source Fund Validation

1. **Required Field**: Source fund must be specified for all new expenses
2. **Category Relationship**: Source fund must be related to the selected category
3. **Fund Existence**: Source fund must exist in the system
4. **Transfer Logic**: Source and destination funds can be the same (internal expense) or different (transfer)

#### Migration Error Handling

1. **Missing Relationships**: Log expenses that cannot be migrated due to missing fund relationships
2. **Data Integrity**: Ensure all migrated expenses have valid source fund references
3. **Rollback Capability**: Provide rollback mechanism if migration fails

### Error Messages

```typescript
export const SOURCE_FUND_ERROR_MESSAGES = {
  SOURCE_FUND_REQUIRED: 'Debe seleccionar un fondo origen para el gasto',
  SOURCE_FUND_INVALID_FOR_CATEGORY:
    'El fondo origen seleccionado no está asociado con esta categoría',
  SOURCE_FUND_NOT_FOUND: 'El fondo origen especificado no existe',
  MIGRATION_SOURCE_FUND_MISSING:
    'No se pudo determinar el fondo origen para el gasto',
} as const;
```

## Testing Strategy

### Unit Tests

1. **API Validation**: Test new source_fund_id validation in create/update endpoints
2. **Migration Logic**: Test migration script with various data scenarios
3. **Balance Calculations**: Test updated fund balance calculations
4. **Error Handling**: Test validation and error scenarios

### Integration Tests

1. **End-to-End Expense Creation**: Test complete expense creation flow with source fund
2. **Expense Editing**: Test editing expenses with source fund changes
3. **Fund Filter Integration**: Test that existing fund filter works with source fund selection
4. **Migration Testing**: Test migration on sample data sets

### UI Tests

1. **Form Validation**: Test source fund dropdown behavior and validation
2. **Category Changes**: Test source fund updates when category changes
3. **Visual Indicators**: Test proper display of source vs destination funds
4. **Backward Compatibility**: Test that existing functionality remains intact

### Migration Testing

1. **Data Integrity**: Verify all expenses get proper source fund assignments
2. **Performance**: Test migration performance on large datasets
3. **Rollback**: Test migration rollback functionality
4. **Edge Cases**: Test migration with orphaned categories, missing funds, etc.

## Implementation Phases

### Phase 1: Database Migration

1. Add source_fund_id column to expenses table
2. Create migration script to populate existing data
3. Add database indexes for performance
4. Test migration on development data

### Phase 2: API Updates

1. Update TypeScript interfaces and validation schemas
2. Modify expense creation endpoint to require source_fund_id
3. Update expense update endpoint to handle source_fund_id changes
4. Update expense retrieval to include source fund information
5. Update fund balance calculations

### Phase 3: Frontend Integration

1. Add source fund dropdown to expense form
2. Implement source fund validation logic
3. Update expense display to show source fund information
4. Integrate with existing fund filter functionality
5. Add visual indicators for fund transfers

### Phase 4: Testing and Validation

1. Comprehensive testing of all components
2. User acceptance testing
3. Performance testing with large datasets
4. Migration testing on production-like data

## Backward Compatibility

### Data Compatibility

- Existing expenses without source_fund_id will be migrated automatically
- Old API calls will continue to work (source fund will be inferred from category)
- Existing fund balance calculations will be updated but remain consistent

### UI Compatibility

- Existing fund filter functionality remains unchanged
- Current expense display format enhanced but not broken
- All existing workflows continue to function

### API Compatibility

- New source_fund_id field is required for new expenses but optional for updates
- Existing API consumers can gradually adopt the new field
- Response format enhanced with new fields but maintains existing structure
