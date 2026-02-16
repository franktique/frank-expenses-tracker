# Design Document

## Overview

The Fondos (Funds) Management feature introduces a comprehensive fund-based financial organization system that extends the existing budget tracker architecture. This feature allows users to create separate funds, assign categories and incomes to specific funds, track fund balances automatically, and transfer money between funds through expense destinations. The design maintains backward compatibility while adding powerful fund-level analytics and balance management.

## Architecture

### Database Schema Extensions

#### New Tables

**funds table:**

```sql
CREATE TABLE funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Modified Tables

**categories table modifications:**

```sql
ALTER TABLE categories ADD COLUMN fund_id UUID REFERENCES funds(id);
```

**incomes table modifications:**

```sql
ALTER TABLE incomes ADD COLUMN fund_id UUID REFERENCES funds(id);
```

**expenses table modifications:**

```sql
ALTER TABLE expenses ADD COLUMN destination_fund_id UUID REFERENCES funds(id);
```

#### Default Fund Setup

The system will automatically create a default fund called 'Disponible' during database initialization:

```sql
INSERT INTO funds (name, description, initial_balance, start_date)
VALUES ('Disponible', 'Fondo por defecto para categorías sin asignación específica', 0, CURRENT_DATE);
```

### API Architecture

#### New API Endpoints

**Funds Management:**

- `GET /api/funds` - List all funds with current balances
- `POST /api/funds` - Create new fund
- `GET /api/funds/[id]` - Get specific fund details
- `PUT /api/funds/[id]` - Update fund details
- `DELETE /api/funds/[id]` - Delete fund (with validation)
- `POST /api/funds/[id]/recalculate` - Recalculate fund balance

**Fund Analytics:**

- `GET /api/dashboard/funds` - Fund dashboard data
- `GET /api/dashboard/funds/balances` - Fund balance trends
- `GET /api/dashboard/funds/transfers` - Fund transfer history

#### Modified API Endpoints

**Categories API:**

- Add fund_id parameter to POST/PUT operations
- Include fund information in GET responses

**Incomes API:**

- Add fund_id parameter to POST/PUT operations
- Include fund information in GET responses

**Expenses API:**

- Add destination_fund_id parameter to POST/PUT operations
- Add fund filtering capability
- Include fund information in GET responses

**Dashboard API:**

- Add fund filtering parameter to existing endpoints
- Modify chart data to support fund-based filtering

## Components and Interfaces

### Core Components

#### FundsView Component

- Main funds management interface
- Fund creation, editing, and deletion
- Balance display and recalculation
- Fund list with sorting and filtering

#### FundsDashboard Component

- Dedicated dashboard for fund analytics
- Balance trends visualization
- Fund allocation charts
- Transfer history and analysis

#### FundFilter Component

- Reusable fund selection filter
- Used in Gastos, Dashboard, and other views
- Maintains filter state across sessions

#### Enhanced Existing Components

**CategoriesView:**

- Add fund selection field in create/edit dialogs
- Display fund assignment in category list
- Fund-based category filtering

**ExpensesView:**

- Add mandatory fund filter at top
- Add optional destination fund field in expense forms
- Filter categories based on selected fund

**IncomesView:**

- Add optional fund selection field
- Display fund assignment in income list

**DashboardView:**

- Add fund filter at top
- Modify all charts to respect fund filtering

### Data Models

#### Fund Interface

```typescript
interface Fund {
  id: string;
  name: string;
  description?: string;
  initial_balance: number;
  current_balance: number;
  start_date: string;
  created_at: string;
  updated_at: string;
}
```

#### Enhanced Existing Interfaces

**Category Interface:**

```typescript
interface Category {
  id: string;
  name: string;
  fund_id?: string; // New field
  fund_name?: string; // Populated in joins
}
```

**Income Interface:**

```typescript
interface Income {
  id: string;
  period_id: string;
  date: string;
  description: string;
  amount: number;
  event?: string;
  fund_id?: string; // New field
  fund_name?: string; // Populated in joins
}
```

**Expense Interface:**

```typescript
interface Expense {
  id: string;
  category_id: string;
  period_id: string;
  date: string;
  payment_method: PaymentMethod;
  description: string;
  amount: number;
  event?: string;
  destination_fund_id?: string; // New field
  destination_fund_name?: string; // Populated in joins
}
```

## Data Models

### Fund Balance Calculation Logic

Fund balances are calculated using the following formula:

```
current_balance = initial_balance
                + sum(incomes where fund_id = fund.id)
                + sum(expenses where destination_fund_id = fund.id)
                - sum(expenses where category.fund_id = fund.id)
```

### Fund Assignment Rules

1. **Categories without fund assignment** → Automatically assigned to 'Disponible' fund
2. **Incomes without fund assignment** → Automatically assigned to 'Disponible' fund
3. **Expenses** → Must select from categories of the currently filtered fund
4. **Fund transfers** → Expense with destination_fund_id creates automatic transfer

### Data Integrity Constraints

1. **Fund deletion** → Prevented if categories or transactions reference the fund
2. **Default fund** → Cannot be deleted or renamed
3. **Balance calculations** → Must handle decimal precision correctly
4. **Date filtering** → Fund calculations respect fund start_date

## Error Handling

### Validation Rules

#### Fund Creation/Update

- Name is required and must be unique
- Start date cannot be in the future
- Initial balance must be a valid decimal
- Description is optional but limited to 500 characters

#### Category Assignment

- Fund must exist and be active
- Cannot assign categories to deleted funds
- Default fund assignment when fund_id is null

#### Income Assignment

- Fund must exist and be active
- Date must be after fund start_date
- Amount must be positive

#### Expense Recording

- Selected fund must have available categories
- Destination fund must exist if specified
- Cannot transfer to the same fund (source and destination)

### Error Messages

```typescript
const ERROR_MESSAGES = {
  FUND_NOT_FOUND: 'El fondo especificado no existe',
  FUND_NAME_REQUIRED: 'El nombre del fondo es obligatorio',
  FUND_NAME_DUPLICATE: 'Ya existe un fondo con este nombre',
  FUND_DELETE_RESTRICTED:
    'No se puede eliminar un fondo con categorías o transacciones asociadas',
  FUND_BALANCE_CALCULATION_ERROR: 'Error al calcular el balance del fondo',
  CATEGORY_FUND_REQUIRED: 'Debe seleccionar un fondo para la categoría',
  EXPENSE_FUND_FILTER_REQUIRED:
    'Debe seleccionar un fondo para filtrar los gastos',
  TRANSFER_SAME_FUND_ERROR: 'No se puede transferir dinero al mismo fondo',
};
```

### Error Recovery

1. **Balance calculation failures** → Display last known balance with warning
2. **Fund filter failures** → Reset to 'Disponible' fund
3. **Category assignment failures** → Assign to default fund with notification
4. **API failures** → Retry with exponential backoff, show user-friendly messages

## Testing Strategy

### Unit Tests

#### Fund Management

- Fund CRUD operations
- Balance calculation accuracy
- Fund assignment validation
- Default fund behavior

#### API Endpoints

- Fund endpoints with various payloads
- Modified category/income/expense endpoints
- Error handling for invalid requests
- Database constraint validation

#### Components

- Fund selection and filtering
- Form validation and submission
- Balance display and formatting
- Dashboard chart rendering

### Integration Tests

#### End-to-End Workflows

- Create fund → Assign categories → Record expenses → Verify balances
- Fund transfer workflow through expense destinations
- Dashboard filtering across multiple funds
- Fund balance recalculation accuracy

#### Database Integration

- Fund balance calculations with complex scenarios
- Referential integrity with cascading operations
- Performance with large datasets
- Concurrent fund operations

### Performance Tests

#### Balance Calculations

- Large number of transactions per fund
- Multiple funds with complex transfer patterns
- Real-time balance updates during high activity

#### Dashboard Rendering

- Fund-filtered charts with large datasets
- Multiple concurrent fund dashboard requests
- Chart responsiveness with fund switching

### User Acceptance Tests

#### Fund Management Workflows

- Create and configure funds for different purposes
- Assign existing categories to new funds
- Record incomes and expenses with fund assignments
- Verify fund balances match expectations

#### Dashboard and Analytics

- Filter main dashboard by different funds
- Use dedicated funds dashboard for analysis
- Verify fund transfer tracking and reporting
- Validate fund balance trends over time

## Implementation Considerations

### Migration Strategy

1. **Database Migration**
   - Add new columns with default values
   - Create funds table with default fund
   - Update existing records to reference default fund

2. **Backward Compatibility**
   - Existing categories/incomes without fund_id → Default to 'Disponible'
   - Existing API calls continue to work
   - Gradual rollout of fund-aware features

3. **Data Migration**
   - Batch update existing records
   - Verify data integrity after migration
   - Provide rollback capability

### Performance Optimizations

1. **Database Indexes**
   - Index on fund_id columns for fast filtering
   - Composite indexes for fund + date queries
   - Index on fund balance calculations

2. **Caching Strategy**
   - Cache fund balances with invalidation on updates
   - Cache fund lists for dropdown components
   - Cache dashboard data with fund-based keys

3. **Query Optimization**
   - Use joins instead of multiple queries
   - Optimize balance calculation queries
   - Implement pagination for large fund lists

### Security Considerations

1. **Access Control**
   - Verify user ownership of funds
   - Validate fund references in all operations
   - Prevent unauthorized fund modifications

2. **Data Validation**
   - Server-side validation for all fund operations
   - Sanitize fund names and descriptions
   - Validate decimal precision for balances

3. **Audit Trail**
   - Log all fund balance changes
   - Track fund assignment modifications
   - Monitor fund transfer patterns
