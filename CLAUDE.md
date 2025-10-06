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

## Application Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL with `@neondatabase/serverless`
- **UI Components**: Radix UI with custom components in `/components/ui/`
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Recharts for data visualization
- **Validation**: Zod schemas
- **Testing**: Jest with React Testing Library

### Core Architecture Patterns

#### Context-Based State Management
The application uses React Context for global state management:
- **BudgetContext** (`/context/budget-context.tsx`) - Main application state
- **AuthContext** (`/lib/auth-context.tsx`) - Authentication state
- **ActivePeriodErrorBoundary** - Handles period-related errors

#### Database Connection Pattern
Database connections use a resilient pattern with retry logic:
- **Safe Client Creation** (`/lib/db.ts`) - Handles connection failures gracefully
- **Exponential Backoff** - Built-in retry mechanism for rate limits
- **Connection Testing** - Validates database connectivity before operations

#### Fund-Based Financial System
The application implements a sophisticated fund management system:
- **Multi-Fund Categories** - Categories can be associated with multiple funds
- **Source Fund Tracking** - Expenses track which fund money comes from
- **Fund Transfers** - Support for inter-fund transfers via expenses
- **Balance Calculations** - Automatic fund balance recalculation

### Key Data Models

#### Core Entities (see `/types/funds.ts`)
- **Fund** - Financial pools with balances (`id`, `name`, `initial_balance`, `current_balance`)
- **Category** - Expense categories with fund associations (`id`, `name`, `associated_funds[]`)
- **Period** - Time periods for budgeting (`id`, `name`, `month`, `year`, `is_open`)
- **Expense** - Transactions with source/destination funds (`source_fund_id`, `destination_fund_id`)
- **Income** - Money inflows to specific funds (`fund_id`)
- **Budget** - Expected spending per category/period

#### Fund System Features
- **Default Fund**: "Disponible" fund for unassigned categories
- **Category-Fund Relationships**: Many-to-many mapping via `category_fund_relationships` table
- **Fund Filtering**: UI can filter data by specific funds or show all
- **Fund Analytics**: Balance trends and transaction history

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
- **Base Components** (`/components/ui/`) - Radix UI wrappers with consistent styling
- **Feature Components** (`/components/`) - Business logic components
- **Chart Components** - Optimized Recharts implementations with performance monitoring

#### Error Handling
- **Error Boundaries** - Component-level error isolation
- **Validation** - Zod schemas for type-safe data validation
- **Fund Validation** - Specialized validation for fund relationships

### Development Patterns

#### Caching Strategy
- **Category-Fund Cache** (`/lib/category-fund-cache.ts`) - In-memory relationship caching
- **Active Period Storage** (`/lib/active-period-storage.ts`) - Session storage for UI state
- **Fund Balance Cache** - Automatic invalidation on fund updates

#### Testing Strategy
- **Unit Tests** - Component and utility function testing
- **Integration Tests** - API endpoint and database testing
- **Migration Tests** - Database schema change validation
- **Performance Tests** - Chart rendering and large dataset handling

#### CSS Conventions
- Uses CSS-in-JS variables for theming (`--primary`, `--background`, etc.)
- Responsive design with mobile-first approach
- Chart-specific styling variables (`--chart-1` through `--chart-5`)

### Common Development Tasks

#### Adding a New Fund Feature
1. Update type definitions in `/types/funds.ts`
2. Add validation schemas with Zod
3. Create API endpoints in `/app/api/`
4. Update BudgetContext if state management needed
5. Add UI components with proper error handling
6. Write tests covering the new functionality

#### Database Schema Changes
1. Create migration script in `/scripts/`
2. Add corresponding API endpoint in `/app/api/`
3. Update type definitions
4. Add rollback and verification scripts
5. Test with existing data scenarios

#### Working with Fund Relationships
- Always validate fund assignments for categories
- Use `CategoryFundFallback` for backward compatibility
- Implement proper cache invalidation
- Handle fund filtering in UI components
- if asked for a password when using playwrigh MCP, use the password: 123

#### Quick-Add Expense Pattern
- **Component**: `/components/expense-form-dialog.tsx` - Reusable dialog for adding expenses
- **Usage**: Can be triggered from any view (dashboard, tables, etc.)
- **Features**:
  - Pre-populate category via `preSelectedCategoryId` prop
  - Auto-handles fund relationships and validation
  - Supports current fund filter context via `currentFundFilter` prop
  - Callback on success via `onSuccess` prop for data refresh
- **Example Implementation** (dashboard-view.tsx:618-633):
  ```tsx
  // Add PlusCircle icon to table rows
  <div className="flex items-center gap-2">
    <span>{item.category_name}</span>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 hover:bg-accent opacity-0 group-hover:opacity-100"
      onClick={() => {
        setSelectedCategoryId(item.category_id);
        setIsQuickAddExpenseOpen(true);
      }}
    >
      <PlusCircle className="h-4 w-4" />
    </Button>
  </div>
  ```