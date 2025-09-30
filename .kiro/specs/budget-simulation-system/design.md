# Design Document

## Overview

The Budget Simulation System extends the existing budget management application by adding simulation capabilities that allow users to create hypothetical budget scenarios and compare them with historical data. The system integrates seamlessly with the existing dashboard agrupadores functionality, leveraging the same chart components, filtering mechanisms, and data visualization patterns while introducing new simulation-specific data models and interfaces.

## Architecture

### High-Level Architecture

The simulation system follows the existing Next.js App Router architecture with the following key components:

```
/app/simular/                    # New simulation pages
├── page.tsx                     # Main simulation management interface
├── [id]/                        # Individual simulation configuration
│   ├── page.tsx                 # Simulation budget configuration
│   └── analytics/               # Simulation analytics
│       └── page.tsx             # Comparative charts interface

/app/api/simulations/            # New API endpoints
├── route.ts                     # CRUD operations for simulations
├── [id]/                        # Individual simulation operations
│   ├── route.ts                 # Get/update/delete simulation
│   ├── budgets/                 # Simulation budget management
│   │   └── route.ts             # CRUD for simulation budgets
│   └── analytics/               # Analytics data endpoints
│       └── route.ts             # Chart data with simulation integration

/components/simulation/          # New simulation components
├── simulation-list.tsx          # Simulation management interface
├── simulation-budget-form.tsx   # Budget configuration form
├── simulation-analytics.tsx     # Enhanced charts with simulation data
└── simulation-comparison-charts.tsx # Period comparison charts
```

### Data Flow Integration

The simulation system integrates with existing data flows:

1. **Simulation Management**: New CRUD operations for simulations and simulation budgets
2. **Chart Data Enhancement**: Existing chart APIs extended to include simulation data
3. **Filter Integration**: Simulation data respects existing agrupador, estudio, and payment method filters
4. **Period Comparison**: Simulation data treated as a virtual "future period" for comparison

## Components and Interfaces

### Database Schema Extensions

#### Simulations Table

```sql
CREATE TABLE simulations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INTEGER, -- For future multi-user support
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Simulation Budgets Table

```sql
CREATE TABLE simulation_budgets (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  efectivo_amount DECIMAL(10,2) DEFAULT 0,
  credito_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(simulation_id, category_id)
);
```

### API Interfaces

#### Simulation Management API

```typescript
// GET /api/simulations
type SimulationListResponse = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  budget_count: number; // Number of categories with budgets set
}[];

// POST /api/simulations
type CreateSimulationRequest = {
  name: string;
  description?: string;
};

// GET /api/simulations/[id]/budgets
type SimulationBudgetsResponse = {
  category_id: number;
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
}[];

// PUT /api/simulations/[id]/budgets
type UpdateSimulationBudgetsRequest = {
  budgets: {
    category_id: number;
    efectivo_amount: number;
    credito_amount: number;
  }[];
};
```

#### Analytics API Extensions

```typescript
// GET /api/simulations/[id]/analytics
type SimulationAnalyticsRequest = {
  estudio_id?: number;
  grouper_ids?: number[];
  payment_methods?: string[];
  comparison_periods?: number; // Number of historical periods to compare
};

type SimulationAnalyticsResponse = {
  historical_data: PeriodComparisonData;
  simulation_data: {
    period_name: "Simulación";
    grouper_data: {
      grouper_id: number;
      grouper_name: string;
      total_amount: number; // Sum of efectivo + credito for categories in this grouper
      budget_amount: number;
    }[];
  };
  comparison_metrics: {
    grouper_id: number;
    grouper_name: string;
    avg_historical: number;
    simulation_amount: number;
    variance_percentage: number;
    trend: "increase" | "decrease" | "stable";
  }[];
};
```

### React Components

#### SimulationList Component

```typescript
interface SimulationListProps {
  simulations: SimulationListResponse;
  onSelect: (simulationId: number) => void;
  onDelete: (simulationId: number) => void;
  onDuplicate: (simulationId: number) => void;
}
```

#### SimulationBudgetForm Component

```typescript
interface SimulationBudgetFormProps {
  simulationId: number;
  categories: CategoryData[];
  initialBudgets?: SimulationBudgetsResponse;
  onSave: (budgets: UpdateSimulationBudgetsRequest) => void;
}
```

#### SimulationAnalytics Component

```typescript
interface SimulationAnalyticsProps {
  simulationId: number;
  estudioFilter?: number;
  grouperFilter?: number[];
  paymentMethodFilter?: string[];
}
```

## Data Models

### Core Data Types

```typescript
type Simulation = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

type SimulationBudget = {
  id: number;
  simulation_id: number;
  category_id: number;
  efectivo_amount: number;
  credito_amount: number;
};

type SimulationChartData = {
  grouper_id: number;
  grouper_name: string;
  simulation_total: number;
  historical_avg: number;
  variance_percentage: number;
  is_simulation: boolean;
};

type EnhancedPeriodComparison = {
  periods: (HistoricalPeriod | SimulationPeriod)[];
  grouper_data: TransformedPeriodData;
  comparison_metrics: ComparisonMetrics[];
};
```

### Data Transformation Logic

#### Simulation Data Processing

```typescript
const processSimulationData = (
  simulationBudgets: SimulationBudget[],
  categories: CategoryData[],
  groupers: GrouperData[],
  paymentMethodFilter: string[]
): SimulationChartData[] => {
  // Group budgets by grouper based on category relationships
  // Apply payment method filtering (efectivo, credito, or both)
  // Calculate totals per grouper
  // Return data in format compatible with existing charts
};
```

#### Historical-Simulation Integration

```typescript
const combineHistoricalAndSimulation = (
  historicalData: PeriodComparisonData,
  simulationData: SimulationChartData[],
  comparisonPeriods: number
): EnhancedPeriodComparison => {
  // Merge historical periods with simulation as newest period
  // Calculate variance metrics
  // Ensure data format compatibility with existing chart components
};
```

## Error Handling

### Simulation-Specific Error Scenarios

1. **Simulation Not Found**: Return 404 with user-friendly message
2. **Budget Validation Errors**: Validate positive numbers, category existence
3. **Data Consistency**: Ensure simulation budgets align with active categories
4. **Chart Data Errors**: Graceful fallback when simulation data is incomplete

### Error Recovery Strategies

```typescript
const simulationErrorHandling = {
  missingSimulation: () => {
    // Redirect to simulation list with error message
    // Offer to create new simulation
  },

  incompleteBudgets: () => {
    // Show warning about missing category budgets
    // Provide quick-fill options (copy from existing period, zero-fill)
  },

  chartDataErrors: () => {
    // Show historical data only with notification
    // Offer to review simulation configuration
  },
};
```

## Performance Considerations

### Database Optimization

1. **Indexing Strategy**

   - Index on `simulation_budgets(simulation_id, category_id)`
   - Composite index for analytics queries
   - Consider materialized views for complex aggregations

2. **Query Optimization**
   - Use JOINs efficiently for simulation-category-grouper relationships
   - Implement pagination for simulation lists
   - Cache frequently accessed simulation data

### Frontend Performance

1. **Chart Rendering**

   - Reuse existing chart optimization patterns
   - Implement data memoization for simulation calculations
   - Use React.memo for expensive chart components

2. **State Management**
   - Minimize re-renders during filter changes
   - Implement efficient state updates for budget forms
   - Use local storage for simulation preferences

### Memory Management

1. **Data Loading**

   - Lazy load simulation analytics data
   - Implement cleanup for unused simulation data
   - Use pagination for large simulation lists

2. **Chart Data**
   - Limit historical periods in comparisons
   - Implement data virtualization for large datasets
   - Clean up chart instances on component unmount
