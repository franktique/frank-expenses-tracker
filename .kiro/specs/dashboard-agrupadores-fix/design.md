# Design Document

## Overview

The Dashboard Agrupadores bug is caused by a table name inconsistency in the database queries. The main issue is in `/app/api/dashboard/groupers/route.ts` where the query references a `transactions` table instead of the `expenses` table that is used throughout the rest of the application. This design addresses the fix by correcting the SQL queries and ensuring consistent table references.

## Architecture

The fix involves updating the SQL queries in two API endpoints:

1. Main groupers endpoint: `/app/api/dashboard/groupers/route.ts`
2. Grouper categories endpoint: `/app/api/dashboard/groupers/[id]/categories/route.ts`

The current architecture uses:

- **Frontend**: React component that fetches data from API endpoints
- **API Layer**: Next.js API routes that query the database
- **Database**: PostgreSQL with tables: `groupers`, `grouper_categories`, `categories`, `expenses`

## Components and Interfaces

### Database Schema

The correct table relationships are:

```
groupers (id, name)
  ↓ (one-to-many via grouper_categories)
grouper_categories (grouper_id, category_id)
  ↓ (many-to-one)
categories (id, name)
  ↓ (one-to-many)
expenses (id, category_id, period_id, amount, payment_method)
```

### API Endpoints

#### `/api/dashboard/groupers`

**Current Issue**: Uses `transactions` table
**Fix**: Change to `expenses` table with proper joins

**Corrected Query Structure**:

```sql
SELECT
  g.id as grouper_id,
  g.name as grouper_name,
  COALESCE(SUM(e.amount), 0) as total_amount
FROM groupers g
LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
LEFT JOIN categories c ON c.id = gc.category_id
LEFT JOIN expenses e ON e.category_id = c.id
  AND e.period_id = $1
  [AND e.payment_method = $2 if payment method filter applied]
GROUP BY g.id, g.name
ORDER BY g.name
```

#### `/api/dashboard/groupers/[id]/categories`

**Current Issue**: Query structure is mostly correct but needs verification
**Fix**: Ensure consistent table joins and proper grouper relationship

## Data Models

### GrouperData Interface

```typescript
type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
};
```

### CategoryData Interface

```typescript
type CategoryData = {
  category_id: string;
  category_name: string;
  total_amount: number;
};
```

## Error Handling

### Database Query Errors

- Maintain existing error handling patterns
- Log specific SQL errors for debugging
- Return appropriate HTTP status codes (400 for bad requests, 500 for server errors)

### Data Validation

- Validate periodId parameter exists and is valid
- Validate grouperId parameter for category endpoint
- Handle cases where no data is found (return empty arrays)

## Testing Strategy

### Manual Testing

1. **Verify Data Display**: Check that groupers with expenses show correct totals
2. **Payment Method Filtering**: Test all payment method options (all, cash, credit)
3. **Category Breakdown**: Click on groupers to verify category details load correctly
4. **Edge Cases**: Test with periods that have no expenses, groupers with no categories

### Database Verification

1. **Query Testing**: Run corrected SQL queries directly against database to verify results
2. **Data Consistency**: Ensure totals match between grouper view and individual expense records
3. **Join Verification**: Confirm proper relationships between groupers, categories, and expenses

### API Testing

1. **Endpoint Response**: Verify API returns expected data structure
2. **Parameter Handling**: Test with different periodId and paymentMethod values
3. **Error Scenarios**: Test with invalid parameters to ensure proper error responses

## Implementation Notes

### Key Changes Required

1. **Table Name Fix**: Change `transactions` to `expenses` in main groupers query
2. **Join Structure**: Update JOIN sequence to properly connect groupers → grouper_categories → categories → expenses
3. **Query Parameters**: Ensure parameterized queries use correct table references

### Backward Compatibility

- No breaking changes to API interface
- Frontend component requires no modifications
- Database schema remains unchanged

### Performance Considerations

- Existing indexes on `grouper_categories` table will support efficient joins
- Query performance should improve with correct table references
- Consider adding index on `expenses(category_id, period_id)` if not already present
