# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Database Commands
The application uses API routes for database operations. Key migration endpoints:
- `/api/setup-db` - Initialize database schema
- `/api/migrate-fondos` - Migrate funds (fondos) tables
- `/api/migrate-category-fund-relationships` - Migrate category-fund relationships
- `/api/migrate-expense-source-funds` - Migrate expense source fund tracking
- `/api/migrate-recurring-dates` - Migrate recurring date features
- `/api/migrate-credit-cards` - Migrate credit card support

## Application Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL with `@neondatabase/serverless`
- **UI Components**: Radix UI with custom components in `/components/ui/`
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Recharts for data visualization
- **Validation**: Zod schemas in `/types/funds.ts`
- **Testing**: Jest with React Testing Library

### Core Architecture Patterns

#### Context-Based State Management
The application uses React Context for global state management:
- **BudgetContext** (`/context/budget-context.tsx`) - Main application state with 2,100+ lines managing all data operations
- **AuthContext** (`/lib/auth-context.tsx`) - Authentication state
- **Active Period Storage** (`/lib/active-period-storage.ts`) - Session storage for UI state persistence

#### Database Connection Pattern
Database connections use a resilient pattern with retry logic:
- **Safe Client Creation** (`/lib/db.ts`) - Handles connection failures gracefully with exponential backoff
- **Rate Limit Handling** - Built-in retry mechanism for Neon database rate limits
- **Connection Testing** - Validates database connectivity before operations
- **Migration System** - Comprehensive migration scripts in `/scripts/` directory

#### Fund-Based Financial System
The application implements a sophisticated fund management system:
- **Multi-Fund Categories** - Categories can be associated with multiple funds via `category_fund_relationships` table
- **Source Fund Tracking** - All expenses must specify a `source_fund_id` for proper fund deductions
- **Fund Transfers** - Support for inter-fund transfers via expenses with `destination_fund_id`
- **Balance Calculations** - Automatic fund balance recalculation with detailed tracking
- **Default Fund Fallback** - "Disponible" fund serves as default for unassigned categories

### Key Data Models

#### Core Entities (see `/types/funds.ts`)
- **Fund** - Financial pools with balances (`id`, `name`, `initial_balance`, `current_balance`, `start_date`)
- **Category** - Expense categories with fund associations (`id`, `name`, `recurring_date?`, `associated_funds[]`)
- **Period** - Time periods for budgeting (`id`, `name`, `month`, `year`, `is_open`)
- **Expense** - Transactions with source/destination funds (`source_fund_id`, `destination_fund_id?`, `credit_card_id?`)
- **Income** - Money inflows to specific funds (`fund_id`, `period_id`, `amount`)
- **Budget** - Expected spending per category/period (`expected_amount`, `expected_date?`)
- **CreditCard** - Credit card information for expense tracking (`bank_name`, `franchise`, `last_four_digits`)

#### Advanced Features
- **Recurring Dates**: Categories can have recurring monthly dates (1-31) for automatic budget date calculation
- **Credit Card Integration**: Expenses can be associated with specific credit cards
- **Payment Methods**: Zod-validated payment method enum system from `/types/estudios.ts`
- **Category-Fund Relationships**: Many-to-many mapping via `category_fund_relationships` table
- **Fund Filtering**: UI can filter data by specific funds or show all data
- **Fund Analytics**: Balance trends and transaction history with recalculation endpoints

### API Structure

#### RESTful Endpoints
- `/api/categories/[id]/funds/` - Manage category-fund relationships
- `/api/expenses/validate-source-fund/` - Validate fund assignments
- `/api/funds/[id]/recalculate/` - Recalculate fund balances
- `/api/dashboard/` - Aggregated data with fund filtering

#### Migration Endpoints
- Database schema migrations are handled via dedicated API routes
- Each migration has corresponding test and rollback scripts in `/scripts/`

### Component Architecture

#### UI Component System
- **Base Components** (`/components/ui/`) - Radix UI wrappers with consistent styling and Tailwind CSS
- **Feature Components** (`/components/`) - Business logic components with fund-aware implementations
- **Specialized Components**:
  - `source-fund-selector.tsx` - Fund selection with validation
  - `multi-fund-selector.tsx` - Multiple fund relationship management
  - `recurring-date-input.tsx` - Date input for category recurring dates
  - `expected-date-display.tsx` - Display component for calculated expected dates

#### Error Handling
- **Error Boundaries** - Component-level error isolation with specialized boundaries:
  - `source-fund-error-boundary.tsx` - Fund-specific error handling
  - `category-fund-error-boundary.tsx` - Category-fund relationship errors
  - `estudio-error-boundary.tsx` - Study/analysis error handling
- **Validation** - Comprehensive Zod schemas in `/types/funds.ts` for type-safe data validation
- **Fund Validation** - Specialized validation for fund relationships and source fund assignments

### Development Patterns

#### Caching Strategy
- **Category-Fund Cache** (`/lib/category-fund-cache.ts`) - In-memory relationship caching with invalidation
- **Active Period Storage** (`/lib/active-period-storage.ts`) - Session storage for UI state persistence
- **Fund Balance Cache** - Automatic invalidation on fund updates with background sync
- **Category Fund Fallback** (`/lib/category-fund-fallback.ts`) - Backward compatibility layer

#### Testing Strategy
- **Unit Tests** - Comprehensive component and utility testing in `__tests__` directories
- **Integration Tests** - API endpoint and database testing with mock data
- **Migration Tests** - Database schema change validation scripts
- **Fund System Tests** - Specialized testing for fund balance calculations and relationships
- **Payment Method Tests** - Validation testing for payment method enum system

#### CSS Conventions
- Uses Tailwind CSS with custom design system variables
- Chart-specific styling variables (`--chart-1` through `--chart-5`)
- Responsive design with mobile-first approach
- Dark/light theme support via `next-themes`

### Common Development Tasks

#### Adding a New Fund Feature
1. Update type definitions in `/types/funds.ts` with proper Zod schemas
2. Add validation schemas and error messages to the constants
3. Create API endpoints in `/app/api/funds/` or related directories
4. Update BudgetContext (`/context/budget-context.tsx`) if state management needed
5. Add UI components with proper error handling and specialized error boundaries
6. Implement caching strategy and invalidation logic
7. Write comprehensive tests covering the new functionality in `__tests__` directories

#### Database Schema Changes
1. Create migration script in `/scripts/` directory with corresponding README
2. Add rollback script for safe migration reversal
3. Add corresponding API endpoint in `/app/api/migrate-*/`
4. Update type definitions in `/types/funds.ts`
5. Add verification and test scripts
6. Test with existing data scenarios and edge cases
7. Update BudgetContext to handle new data structures

#### Working with Fund Relationships
- Always validate fund assignments for categories using source fund validation
- Use `CategoryFundFallback` (`/lib/category-fund-fallback.ts`) for backward compatibility
- Implement proper cache invalidation via `invalidateCategoryFundCache()`
- Handle fund filtering in UI components with `getFilteredCategories()`, `getFilteredExpenses()`, etc.
- Ensure proper error boundaries are in place for fund-related operations
- Test fund balance recalculation after any fund relationship changes

#### Testing Guidelines
- Use Jest configuration defined in `jest.config.js`
- Place tests in `__tests__` directories alongside source files
- Test migration scripts with both forward and rollback scenarios
- Include fund balance calculation tests for any fund-related changes
- Test error boundaries and validation schemas thoroughly

### Important Notes
- When working with Playwright MCP, use the password: 123
- Always run `npm run lint` and `npm run test` before committing
- The application uses extensive caching - ensure proper cache invalidation
- Fund balance calculations are critical - test thoroughly when modifying fund logic
- The "Disponible" fund is the default - ensure compatibility when adding new fund features