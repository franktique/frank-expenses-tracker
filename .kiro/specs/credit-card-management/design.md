# Design Document

## Overview

The credit card management feature adds a new entity to the budget tracker system that allows users to register and manage their credit cards. This feature integrates seamlessly with the existing expense tracking system by providing an optional credit card association for expenses. The design follows the existing patterns in the codebase, using Next.js API routes, TypeScript interfaces, and React components with Tailwind CSS styling.

## Architecture

### Database Schema

The feature introduces a new `credit_cards` table and modifies the existing `expenses` table:

```sql
-- New credit_cards table
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(255) NOT NULL,
  franchise VARCHAR(50) NOT NULL CHECK (franchise IN ('visa', 'mastercard', 'american_express', 'discover', 'other')),
  last_four_digits CHAR(4) NOT NULL CHECK (last_four_digits ~ '^[0-9]{4}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add credit_card_id to expenses table
ALTER TABLE expenses ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_expenses_credit_card_id ON expenses(credit_card_id);
```

### API Architecture

Following the existing RESTful API pattern in `/app/api/`, the feature will add:

- `/api/credit-cards` - CRUD operations for credit cards
- `/api/credit-cards/[id]` - Individual credit card operations
- Extend existing `/api/expenses` endpoints to handle credit card associations

### Data Flow

1. **Credit Card Management**: Users manage credit cards through a dedicated view
2. **Expense Integration**: Credit card selection is added to expense forms
3. **Data Persistence**: Credit card associations are stored in the database
4. **Display Integration**: Credit card information appears in expense lists and exports

## Components and Interfaces

### TypeScript Interfaces

```typescript
// Credit Card entity
export interface CreditCard {
  id: string;
  bank_name: string;
  franchise: CreditCardFranchise;
  last_four_digits: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Credit Card franchise enum
export type CreditCardFranchise =
  | "visa"
  | "mastercard"
  | "american_express"
  | "discover"
  | "other";

// Enhanced Expense interface
export interface Expense {
  // ... existing fields
  credit_card_id?: string;
  credit_card_info?: {
    bank_name: string;
    franchise: CreditCardFranchise;
    last_four_digits: string;
  };
}
```

### Validation Schemas

```typescript
export const CreditCardSchema = z.object({
  id: z.string().uuid(),
  bank_name: z.string().min(1, "El nombre del banco es obligatorio").max(255),
  franchise: z.enum([
    "visa",
    "mastercard",
    "american_express",
    "discover",
    "other",
  ]),
  last_four_digits: z
    .string()
    .regex(/^[0-9]{4}$/, "Deben ser exactamente 4 dígitos"),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateCreditCardSchema = z.object({
  bank_name: z.string().min(1, "El nombre del banco es obligatorio").max(255),
  franchise: z.enum([
    "visa",
    "mastercard",
    "american_express",
    "discover",
    "other",
  ]),
  last_four_digits: z
    .string()
    .regex(/^[0-9]{4}$/, "Deben ser exactamente 4 dígitos"),
  is_active: z.boolean().optional().default(true),
});

export const UpdateCreditCardStatusSchema = z.object({
  is_active: z.boolean(),
});
```

### React Components

#### CreditCardsView Component

- Main management interface for credit cards
- CRUD operations with modal dialogs
- Table display with bank name, franchise, masked card number, and active status
- Toggle buttons or switches to activate/deactivate cards
- Visual indicators (badges, colors) to distinguish active from inactive cards
- Integration with existing UI patterns (Card, Table, Dialog components)

#### CreditCardSelector Component

- Reusable dropdown component for expense forms
- Displays only active cards in format: "Bank - Franchise \*\*\*\*1234"
- When editing expenses, shows currently selected card even if inactive (with visual indicator)
- Optional selection with "No card" option
- Follows existing selector component patterns
- Handles loading states and empty states gracefully

#### Enhanced ExpensesView Component

- Add credit card selector to expense creation/editing forms
- Display credit card information in expense tables with status indicators
- Show inactive credit cards with visual distinction (grayed out, "Inactive" badge)
- Include credit card data in CSV exports regardless of status
- Maintain backward compatibility with existing expenses

### Navigation Integration

Add new menu item to the existing sidebar navigation:

- Spanish label: "Tarjetas de Crédito"
- Icon: CreditCard from Lucide React
- Route: `/tarjetas-credito`

## Data Models

### Credit Card Entity

**Properties:**

- `id`: UUID primary key
- `bank_name`: String (1-255 characters) - Bank or financial institution name
- `franchise`: Enum - Card network (Visa, Mastercard, etc.)
- `last_four_digits`: String (4 digits) - Last four digits of card number
- `is_active`: Boolean - Whether the card is active and available for new expenses
- `created_at`: Timestamp - Creation date
- `updated_at`: Timestamp - Last modification date

**Business Rules:**

- Bank name is required and cannot be empty
- Franchise must be one of the predefined values
- Last four digits must be exactly 4 numeric characters
- Each credit card is uniquely identified by its UUID
- New credit cards are active by default
- Inactive cards cannot be selected for new expenses
- Inactive cards can still be displayed in existing expense records
- Cards can be reactivated at any time

### Enhanced Expense Entity

**New Properties:**

- `credit_card_id`: Optional UUID foreign key to credit_cards table
- `credit_card_info`: Populated join data for display purposes

**Business Rules:**

- Credit card association is optional for all expenses
- Existing expenses without credit cards remain valid
- Credit card can be changed or removed from expenses
- Deleting a credit card sets expense associations to NULL

## Error Handling

### Validation Errors

- Invalid bank name (empty, too long)
- Invalid franchise selection
- Invalid last four digits format (non-numeric, wrong length)
- Duplicate credit card detection (same bank + franchise + digits). Create a unique key in the database with this combination

### Database Errors

- Foreign key constraint violations
- Connection timeouts with retry logic
- Transaction rollback on partial failures

### User Experience Errors

- Graceful degradation when credit card data is unavailable
- Clear error messages in Spanish
- Form validation with real-time feedback
- Confirmation dialogs for destructive operations

### Error Recovery

- Retry mechanisms for network failures
- Fallback to basic expense functionality if credit card features fail
- Data integrity preservation during errors
- User notification of temporary unavailability

## Security Considerations

### Data Protection

- Only store last four digits, never full card numbers
- No storage of sensitive information (CVV, expiration dates)
- UUID-based identifiers to prevent enumeration attacks
- Input sanitization for all user-provided data

### Access Control

- Credit cards are user-scoped (future enhancement for multi-user)
- Proper authorization checks in API endpoints
- SQL injection prevention through parameterized queries
- XSS prevention through proper data encoding

### Privacy

- Minimal data collection (only necessary fields)
- Clear data usage in UI labels
- Option to delete credit cards and associations
- No logging of sensitive credit card information
