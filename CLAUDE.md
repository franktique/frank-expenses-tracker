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
- `/api/migrate-tipo-gasto` - Add tipo_gasto column to categories for expense type classification
- `/api/migrate-tipo-gasto-constraint` - Update tipo_gasto constraint to include E (Eventual) type

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
- **Category** - Expense categories with fund associations (`id`, `name`, `associated_funds[]`, `tipo_gasto`)
  - **Tipo Gasto**: Expense type classification (F=Fijo/Fixed, V=Variable, SF=Semi Fijo/Semi-Fixed)
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

#### Working with Tipo Gasto (Expense Types)
The **Tipo Gasto** feature classifies categories into four expense types:
- **F (Fijo)** - Fixed expenses (blue badge) - Regular, recurring expenses like rent, insurance
- **V (Variable)** - Variable expenses (green badge) - Expenses that fluctuate like groceries, entertainment
- **SF (Semi Fijo)** - Semi-fixed expenses (orange badge) - Partially recurring like utilities, subscriptions
- **E (Eventual)** - Eventual expenses (red badge) - Rare, one-time expenses like car repairs, medical bills

**Implementation Details**:
- Constants defined in `/types/funds.ts`: `TIPO_GASTO_VALUES`, `TIPO_GASTO_LABELS`
- Validation: Uses Zod enum validation in category schemas
- Database: Stored in `categories.tipo_gasto` as VARCHAR(2) with check constraint
- UI Components:
  - `TipoGastoBadge` (`/components/tipo-gasto-badge.tsx`) - Display with color coding
  - `TipoGastoSelect` (`/components/tipo-gasto-select.tsx`) - Form select component
- Migration: Use `/api/migrate-tipo-gasto` endpoint to add column to existing databases
- Optional field: Type is optional for backward compatibility

**Adding Tipo Gasto to New Features**:
1. Include `tipo_gasto?: TipoGasto` in data models
2. Add to validation schemas with `.enum(["F", "V", "SF"]).optional()`
3. Use `TipoGastoBadge` component for display
4. Use `TipoGastoSelect` component for form input
5. Remember to handle undefined/null values gracefully

#### Quick-Add Expense Pattern
- **Password Note**: if asked for a password when using playwright MCP, use the password: 123
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

#### Simulation Budget Form - Drag & Drop Reordering
The **Simulation Budget Form** (`/components/simulation-budget-form.tsx`) now supports drag-and-drop reordering of budget categories with automatic balance recalculation.

**Features**:
- **Drag Handle Icon** - GripVertical icon appears on hover over each row for intuitive drag indication
- **Custom Category Ordering** - Users can reorder categories within their tipo_gasto groups using drag & drop
- **Group Boundary Protection** - Drag operations are restricted within the same tipo_gasto group; dragging across groups is prevented with visual feedback
- **Automatic Balance Recalculation** - Running balances update immediately after dropping a category in a new position
- **Local Persistence** - Custom order is saved to browser localStorage (`simulation_${simulationId}_category_order`) and restored across browser sessions
- **Integration with Tipo Gasto Sorting** - Custom drag order applies within tipo_gasto groups after tipo_gasto sorting is applied

**Implementation Details**:
- **State Management**: Uses `categoryOrder`, `draggedCategoryId`, `draggedTipoGasto`, and `isValidDropTarget` states
- **Drag Handlers**:
  - `handleDragStart` - Captures dragged category ID and tipo_gasto value
  - `handleDragOver` - Validates drop target is in same tipo_gasto group, provides visual feedback
  - `handleDrop` - Reorders category array and updates state
  - `handleDragEnd` - Clears drag state
- **Sorting Integration**:
  - `getSortedCategories` memoized selector applies custom order after tipo_gasto grouping
  - `categoryBalances` automatically recalculates based on new sorted order
- **Local Storage**:
  - Loads saved order on component mount from browser localStorage with JSON parsing and error handling
  - Saves order to browser localStorage whenever `categoryOrder` changes
  - Persists across browser sessions and page reloads

**Visual Feedback**:
- Dragged row: `opacity-50 bg-accent`
- Valid drop zone (same grupo): `bg-blue-50 dark:bg-blue-950`
- Drag cursor: `cursor-move` on table rows
- Drag handle icon: Visible on row hover with `opacity-0 group-hover:opacity-100 transition-opacity`

**Usage Example**:
```tsx
// Users can drag category rows to reorder within tipo_gasto groups
// 1. Click and hold on drag handle (GripVertical icon)
// 2. Drag over target row within same tipo_gasto group
// 3. Drop to reorder - balances automatically recalculate
// 4. Order persists in browser localStorage across sessions
```

**Notes**:
- Custom order persists in browser localStorage across sessions but is not synced to database
- Order is stored locally per simulation: `simulation_${simulationId}_category_order`
- Order survives browser session, page refreshes, and tab closures
- Clearing browser localStorage will reset the custom order to default
- When tipo_gasto sort is toggled off, custom order is preserved
- Categories with undefined tipo_gasto are treated as separate group
- Custom order applies per user/device (each device maintains its own order)