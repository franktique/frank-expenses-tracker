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

#### Simulation Sub-Groups - Grouping Categories
The **Simulation Sub-Groups** feature allows users to organize budget categories into logical groups with their own subtotals and management controls.

**Features**:
- **Create Sub-Groups**: Select multiple categories and name the group with automatic API save
- **Display Organization**: Collapsible headers with expand/collapse toggle, shows category count and subtotals
- **Subtotal Rows**: Display aggregated Efectivo, Crédito, Ahorro Esperado, and Total per sub-group
- **Delete Sub-Groups**: Confirmation dialog removes group (categories remain uncategorized)
- **Mixed Layout**: Uncategorized categories can be interspersed with sub-groups at any position
- **Database Persistence**: All sub-groups persisted to PostgreSQL with proper relationships

**Data Model**:
- `simulation_subgroups` table: `id`, `simulation_id`, `name`, `display_order`, `created_at`, `updated_at`
- `subgroup_categories` junction table: `id`, `subgroup_id`, `category_id`, `order_within_subgroup`

**API Endpoints**:
- `GET /api/simulations/[id]/subgroups` - Fetch all sub-groups with categories
- `POST /api/simulations/[id]/subgroups` - Create sub-group with selected categories
- `PATCH /api/simulations/[id]/subgroups/[subgroupId]` - Update sub-group name/order
- `DELETE /api/simulations/[id]/subgroups/[subgroupId]` - Delete sub-group (cascade to categories)
- `POST /api/migrate-simulation-subgroups` - Initialize database tables if needed

**Components**:
- `SubgroupNameDialog` (`components/subgroup-name-dialog.tsx`) - Modal for naming new sub-groups
- `SubgroupHeaderRow` (`components/subgroup-header-row.tsx`) - Renders header with expand/collapse and delete
- `SubgroupSubtotalRow` (`components/subgroup-subtotal-row.tsx`) - Renders subtotal row with aggregated values

**Utilities**:
- `organizeTableRowsWithSubgroups()` - Merges sub-groups and uncategorized categories for table rendering
- `calculateSubgroupSubtotals()` - Memoized calculation of sub-group totals
- `shouldShowRow()` - Determines visibility based on expand/collapse state
- `getSubgroupForCategory()` - Finds parent sub-group for a category

**Integration Notes**:
- **Filters**: `hideEmptyCategories` and `excludedCategoryIds` work with sub-groups (filters individual categories while subtotals show full group)
- **Drag-Drop**: Individual categories within expanded sub-groups can be reordered; collapsed sub-group categories are not draggable
- **Tipo_gasto Sort**: Categories sort by tipo_gasto within sub-groups; sub-groups maintain integrity during sort operations
- **Excel Export**: Sub-groups displayed as indented headers with category rows and subtotal rows in exported Excel files

**Adding Sub-Groups to Components**:
1. Import types: `import type { Subgroup } from "@/types/simulation"`
2. Fetch sub-groups: `const subgroups = await fetch(/api/simulations/${id}/subgroups).then(r => r.json())`
3. Organize table: `const tableRows = organizeTableRowsWithSubgroups(subgroups, categories, excludedIds)`
4. Track expansion: `const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())`
5. Render with visibility: `if (shouldShowRow(row, tableRows, expandedSubgroups)) { /* render */ }`

**Performance**:
- Sub-group subtotal calculations use `useMemo` to prevent unnecessary recalculations
- Table organization is O(n + s) where n = categories and s = sub-groups
- Expand/collapse is O(1) state toggle with no data fetching

#### Simulation Sub-Groups - Add/Remove Categories
The **Simulation Sub-Groups Enhancement** allows users to dynamically add and remove categories from existing sub-groups within the budget simulation form.

**Features**:
- **Add Categories Button**: '+' button on sub-group headers enters "add mode" to select uncategorized categories
- **Done Button**: Replaces '+' button during add mode; clicking it adds selected categories to the sub-group
- **Cancel Functionality**: 'X' button exits add mode without saving changes
- **Remove Categories**: Small trash icons appear on category rows within sub-groups for easy removal
- **Visual Feedback**: Selected categories highlight with blue background during add mode
- **Disabled State**: '+' button disables when no uncategorized categories are available

**State Management**:
- `addingToSubgroupId: string | null` - Tracks which sub-group is in add mode (only one at a time)
- `categoriesToAddToSubgroup: (string | number)[]` - Categories selected for addition
- `isAddingCategoriesLoading: boolean` - Loading state during API operations

**Handlers**:
- `getUncategorizedCategories()` - Returns categories not in any sub-group (filtered by current sort/filters)
- `getSubgroupForCategory()` - Finds which sub-group a category belongs to
- `handleAddToSubgroupClick()` - Enters add mode for a sub-group
- `handleDoneAddingToSubgroup()` - Saves selected categories to sub-group via API
- `handleRemoveCategoryFromSubgroup()` - Removes category from sub-group with confirmation
- `handleCancelAddToSubgroup()` - Exits add mode without saving
- `toggleCategoryForAddition()` - Toggles category selection during add mode

**Component Integration**:
- `SubgroupHeaderRow` - Updated with new props: `isInAddMode`, `onAddCategories`, `onDoneAddingCategories`, `onCancelAddingCategories`, `canAddCategories`
- Category rows show checkboxes for uncategorized categories when in add mode
- Category rows show delete buttons for categorized items in expanded sub-groups

**API Operations**:
- `PATCH /api/simulations/[id]/subgroups/[subgroupId]` - Adds categories (sends full categoryIds array)
- Automatic UI update after successful API call
- Confirmation dialog before removing categories

**User Flow**:
1. User sees '+' button on sub-group header (disabled if no uncategorized categories)
2. Click '+' to enter add mode - checkboxes appear on uncategorized categories
3. Select desired categories via checkboxes
4. Click 'Done' to add them to the sub-group (button shows in header)
5. Or click 'X' to cancel and exit add mode
6. To remove categories: click trash icon on any categorized row
7. Confirm removal in dialog, category moves back to uncategorized section

**Key Implementation Details**:
- Uncategorized categories are filtered by current view (respects hideEmptyCategories, excludedCategoryIds, sort order)
- Only one sub-group can be in add mode at a time
- Selected categories get visual blue highlight background
- API updates sub-group atomically (sends all category IDs at once)
- Toast notifications for success/error feedback
- Confirmation dialogs prevent accidental category removal

#### Simulation Sub-Groups - Drag & Drop Reordering
The **Simulation Sub-Groups Drag & Drop Reordering** feature allows users to reorganize sub-groups and reorder them relative to each other and uncategorized categories through intuitive drag-and-drop interactions.

**Features**:
- **Drag Sub-Group Headers**: Click and drag sub-group headers to move entire groups above/below other sub-groups
- **Move Relative to Categories**: Sub-groups can be positioned above, below, or between uncategorized categories
- **Visual Drag Feedback**:
  - Drag handle icon (GripVertical) appears on sub-group headers on hover
  - Dragged row shows reduced opacity (50%) and accent background color
  - Drop zones highlight with blue background (light blue-50 for light theme, dark blue-950 for dark theme)
  - Cursor changes to move cursor while dragging
- **Custom Order Persistence**: Sub-group ordering is saved to browser localStorage and restored across sessions
  - Key format: `simulation_${simulationId}_subgroup_order`
  - Persists across browser sessions, page reloads, and tab closures
- **Collapsed Groups Support**: Can drag sub-groups even when collapsed; categories move together with header
- **Disabled During Operations**: Dragging is disabled when:
  - In add/edit mode for any sub-group
  - Auto-save or manual save is in progress
  - Sub-group is being deleted
- **Balance Calculations**: Running balances automatically recalculate based on new sub-group order

**Data Structures**:
- `subgroupOrder`: `string[]` - Array of sub-group IDs in custom order
- `subgroupDragState`: Object tracking drag operations with `draggedItemId`, `draggedItemType`, `dropZoneIndex`
- `uncategorizedCategoryOrder`: `(string | number)[]` - For future uncategorized category reordering

**State Management**:
- `subgroupOrder` is initialized from localStorage or database `displayOrder`
- Auto-saves to localStorage on every change
- Validated against existing sub-groups to handle deleted items
- Separate from database `displayOrder` - UI-only state

**Handlers**:
- `handleSubgroupDragStart()` - Initiate drag with validation
- `handleSubgroupDragOver()` - Manage drop zone feedback
- `handleSubgroupDrop()` - Execute reordering logic
- `handleSubgroupDragEnd()` - Clean up drag state
- `isSubgroupDraggingDisabled()` - Check if drag is allowed

**Component Integration**:
- `SubgroupHeaderRow` (props on lines 24-30) - Accepts drag handlers and visual state props
  - `isDragging`: Applied opacity-50 and accent background
  - `isDragOver`: Applied blue-50 background for drop zones
  - `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` - Drag event handlers
- Table rendering (lines 1795-1803) - Uses `reorganizeTableRowsWithSubgroupOrder()` when custom order exists
- Visual updates (lines 1836-1837) - Tracks which row is being dragged/dropped

**Utilities** (`/lib/subgroup-reordering-utils.ts`):
- `moveSubgroupInOrder()` - Reorder sub-groups in array
- `reorganizeTableRowsWithSubgroupOrder()` - Apply custom order to table rows
- `validateSubgroupId()` - Check if sub-group exists
- `cleanupSubgroupOrder()` - Remove deleted sub-groups from order
- `initializeSubgroupOrder()` - Create initial order from database

**Browser Compatibility**:
- Uses HTML5 Drag & Drop API
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Gracefully falls back to database order if localStorage unavailable

**Usage Example**:
```tsx
// Users drag sub-group headers to reorder:
1. Hover over sub-group header to see drag handle icon
2. Click and drag the header to move the sub-group
3. Drop above/below another sub-group or uncategorized section
4. Order automatically saves to localStorage
5. Refresh page - custom order is restored
```

**Performance Considerations**:
- Sub-group reordering uses memoized table row organization
- Drag events don't trigger API calls (UI-only reordering)
- Balance recalculation is automatic via existing memoized selector
- Each simulation maintains independent order (per-browser/device)

**Integration with Existing Features**:
- **Tipo Gasto Sorting**: Subgroups maintain relative order when tipo_gasto sort is applied
- **Category Drag-Drop**: Individual categories within subgroups use existing category-level drag (doesn't interfere)
- **Auto-Save**: Captures new sub-group order in auto-save operations
- **Excel Export**: Exported files respect custom sub-group order
- **Collapsed State**: Order is independent of expand/collapse state

**Known Limitations**:
- Custom order is browser/device-specific (not synced across devices)
- Order is not stored in database (stored only in localStorage)
- Clearing browser data will reset order to default
- Uncategorized categories reordering is not yet implemented

#### Simulation Budget - Visibility Toggle
The **Visibility Toggle** feature allows users to hide specific sub-groups and categories in the budget simulation form, with hidden items automatically excluded from balance calculations and displayed with strikethrough text styling.

**Features**:
- **Eye Icon Toggle**: Eye icon appears on:
  - Sub-group headers (left side, visible on hover)
  - Individual category rows (right side, visible on hover)
- **Visual Feedback**: Hidden items display with:
  - Strikethrough (line-through) text styling
  - Reduced opacity (60%) for visual de-emphasis
- **Smart Calculations**: Hidden items are automatically excluded from:
  - Sub-group subtotals
  - Running balance calculations
  - Total budget calculations
- **Hierarchy Awareness**:
  - Hiding a sub-group hides all its contained categories
  - Individual categories can be hidden independently within expanded sub-groups
  - Parent sub-group visibility is respected when calculating category visibility
- **Persistence**: Visibility state saved to browser localStorage with key format:
  - `simulation_${simulationId}_visibility_state`
  - Persists across browser sessions and page reloads

**State Management**:
- `visibilityState`: `Record<string | number, boolean>` - Maps item IDs to visibility state
  - Default: items visible (true) unless explicitly hidden in state
  - Stores both subgroup IDs and category IDs
- Initialized from localStorage on component mount
- Auto-saves to localStorage whenever state changes

**Visibility Logic**:
- **Sub-group Visibility**: Direct visibility state
  - Item hidden if `visibilityState[subgroupId] === false`
- **Category Visibility**: Considers both item and parent sub-group
  - Item hidden if own visibility is false OR parent subgroup is hidden
  - Uses `isCategoryVisible(categoryId, parentSubgroupId, visibilityState)` utility

**Component Updates**:
- `SubgroupHeaderRow` - Added `isVisible` prop and `onToggleVisibility` callback
  - Eye/EyeOff icon button with purple hover color
  - Button hidden during add-category mode
  - Icon shows on hover with smooth opacity transition
- `SubgroupSubtotalRow` - Added `isSubgroupVisible` prop
  - Displays strikethrough styling when parent subgroup is hidden
- Category rows - Added visibility toggle button in last cell
  - Eye/EyeOff icon button with purple hover color
  - Updates when category is hidden

**Utilities** (`/lib/visibility-calculation-utils.ts`):
- `isItemVisible()` - Check if item is visible (defaults to visible)
- `isSubgroupVisible()` - Check subgroup visibility
- `isCategoryVisible()` - Check category visibility (considers parent)
- `toggleVisibility()` - Toggle visibility state for an item
- `filterVisibleCategories()` - Get only visible categories from a list
- `countVisibleCategories()` - Count visible categories (for header display)
- `saveVisibilityToStorage()` - Persist to localStorage
- `loadVisibilityFromStorage()` - Load from localStorage

**Calculation Updates**:
- `categoryBalances` memo updated to skip hidden categories
  - Uses `isCategoryVisible()` check before including in balance calculation
  - Excludes net spend from hidden items
- `subgroupBalances` memo updated to skip hidden categories
  - Only counts visible categories toward subgroup balance
- `calculateSubgroupSubtotals()` function accepts optional `visibilityState` parameter
  - Checks both subgroup and category visibility before summing
  - Maintains backward compatibility (optional parameter)

**Styling**:
- Strikethrough: CSS `line-through` class applied to hidden rows
- Opacity: `opacity-60` applied to hidden rows
- Eye icon color: Purple hover background (`hover:bg-purple-100 dark:hover:bg-purple-900/20`)
- Icon size: `h-4 w-4` (consistent with other icons)

**User Interaction Flow**:
1. User hovers over subgroup header or category row
2. Eye icon appears with smooth opacity transition
3. User clicks eye icon to toggle visibility
4. Item immediately shows strikethrough styling if hidden
5. Balance calculations update automatically
6. Visibility state persists to localStorage

**Integration with Existing Features**:
- **Sub-group Management**: Works with create/edit/delete operations
  - Visibility independent of sub-group organization
  - Hidden categories can still be added/removed from sub-groups
- **Drag & Drop**: Compatible with category and sub-group reordering
  - Can drag hidden items (visibility doesn't affect dragging)
  - Dropped items retain their visibility state
- **Tipo Gasto Sorting**: Visibility independent of sort order
  - Hidden items stay hidden after sorting
  - Sort order applies within visible items
- **Excel Export**: Respects visibility state
  - Only visible items included in exported data
- **Auto-Save**: Captures visibility state in saved simulations
  - Visibility persists independently of other budget changes

**Known Limitations**:
- Visibility state is browser/device-specific (not synced across devices)
- Not stored in database (UI-only state in localStorage)
- Clearing browser localStorage will reset visibility state
- Visibility is per-simulation (independent tracking for each simulation)

#### Overspend Analysis - Current Period vs All Periods
The **Overspend Actual** dashboard provides two views for analyzing spending overage across budgets:

**Menu Structure**:
- "Overspend Actual" submenu in sidebar with two options:
  - **Periodo Actual** - Shows overspend data for the currently active period only
  - **Todos los Periodos** - Shows aggregated overspend across all existing periods

**Current Period View** (`/dashboard/overspend`):
- Displays overspend for the active period with horizontal bar chart
- Shows Planeado (Budgeted) vs Excedente (Overspend) side-by-side
- Filters: Payment method (Todos, Efectivo/Débito, Tarjeta Crédito)
- Category exclusion filter available via Settings button
- KPI cards for total overspend by payment method
- Categories sorted by overspend amount (highest to lowest)

**All Periods View** (`/dashboard/overspend/all-periods`):
- Aggregates overspend data across all available periods in an intuitive timeline interface
- **Period Cards Timeline**:
  - Grid of clickable period cards showing overspend values
  - Each card displays:
    - Period name
    - Total overspend amount (red/green color coded)
    - Total planned and spent amounts
  - Cards sorted by newest periods first (year and month)
  - Selected period highlighted with blue border
  - Responsive grid (1-4 columns depending on screen size)
- **Detail Breakdown Table**:
  - Shows when a period is selected
  - Displays all categories with overspend for that period
  - Includes columns for planned, spent, overspend, and percentage
  - Categories sorted by overspend amount (highest first)
  - Rows highlighted if category has overspend
- Same filtering options as current period view:
  - Payment method filtering (Todos, Efectivo/Débito, Tarjeta Crédito)
  - Category exclusion filtering via Settings button
- Loading and error states for data fetching

**API Endpoint**:
- `GET /api/overspend/all-periods` - Fetches aggregated overspend data
  - Query Parameters:
    - `paymentMethod` (optional): "cash", "credit", or undefined for all
    - `excludedCategories` (optional): Comma-separated list of category IDs to exclude
  - Response: `AllPeriodsOverspendResponse` with:
    - `overspendByCategory[]` - Array of categories with period-wise breakdown
    - `summary` - Aggregate totals and payment method breakdown

**Data Types** (`/types/funds.ts`):
- `PeriodOverspendData` - Single period's overspend data for a category
- `CategoryOverspendRow` - Category with all periods' overspend data
- `AllPeriodsOverspendResponse` - Complete API response structure

**Implementation Details**:
- Uses client-side data fetching (no BudgetContext dependency)
- Automatic data refresh when filters change
- Responsive design supports mobile, tablet, and desktop views
- Memoized calculations for performance optimization
- Chart labels show currency formatted amounts (es-MX locale)

**User Flow - All Periods View**:
1. Navigate to "Overspend Actual" → "Todos los Periodos" in sidebar
2. Page loads showing a grid of period cards with overspend values
3. Each period card displays:
   - Period name
   - Total overspend amount in large font (red if overspent, green if under budget)
   - Summary of planned vs spent amounts
4. Click on any period card to select it and view details
5. Selected period shows:
   - Period card highlighted with blue border
   - Detailed breakdown table below showing all categories
   - Categories sorted by highest overspend first
6. Use payment method dropdown to filter data by payment type (affects all periods)
7. Click "Filtros" button to show category exclusion filter
8. Select categories to exclude from calculations
9. Period cards and detail table automatically update as filters change
10. Click on a different period to switch detailed view