# Simulation System Database Migration

This document describes the database schema and API endpoints created for the Budget Simulation System.

## Database Schema

### Tables Created

#### `simulations`

- `id` (SERIAL PRIMARY KEY) - Unique identifier for each simulation
- `name` (VARCHAR(255) NOT NULL) - User-defined name for the simulation
- `description` (TEXT) - Optional description of the simulation
- `user_id` (INTEGER) - For future multi-user support
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - Last update timestamp

#### `simulation_budgets`

- `id` (SERIAL PRIMARY KEY) - Unique identifier for each budget entry
- `simulation_id` (INTEGER NOT NULL) - Foreign key to simulations table
- `category_id` (UUID NOT NULL) - Foreign key to categories table
- `efectivo_amount` (DECIMAL(10,2) DEFAULT 0) - Budget amount for cash payments
- `credito_amount` (DECIMAL(10,2) DEFAULT 0) - Budget amount for credit payments
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - Last update timestamp
- `UNIQUE(simulation_id, category_id)` - Ensures one budget per category per simulation

### Indexes Created

- `idx_simulation_budgets_simulation_id` - Fast lookups by simulation
- `idx_simulation_budgets_category_id` - Fast lookups by category
- `idx_simulation_budgets_simulation_category` - Composite index for simulation-category queries
- `idx_simulations_created_at` - Ordered by creation date for listing

### Foreign Key Relationships

- `simulation_budgets.simulation_id` → `simulations.id` (CASCADE DELETE)
- `simulation_budgets.category_id` → `categories.id` (CASCADE DELETE)

## API Endpoints

### Migration Endpoint

#### `GET /api/migrate-simulations`

Creates the simulation tables and indexes if they don't exist.

**Response:**

```json
{
  "success": true,
  "message": "Simulation tables and indexes created successfully"
}
```

### Simulation Management

#### `GET /api/simulations`

Lists all simulations with budget counts.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Q1 Budget Scenario",
    "description": "First quarter budget simulation",
    "user_id": null,
    "created_at": "2025-01-22T10:00:00Z",
    "updated_at": "2025-01-22T10:00:00Z",
    "budget_count": 5
  }
]
```

#### `POST /api/simulations`

Creates a new simulation.

**Request Body:**

```json
{
  "name": "New Simulation",
  "description": "Optional description"
}
```

**Validation:**

- `name` is required and cannot be empty
- `name` cannot exceed 255 characters
- `description` is optional

#### `GET /api/simulations/[id]`

Gets individual simulation details.

**Response:**

```json
{
  "id": 1,
  "name": "Q1 Budget Scenario",
  "description": "First quarter budget simulation",
  "user_id": null,
  "created_at": "2025-01-22T10:00:00Z",
  "updated_at": "2025-01-22T10:00:00Z",
  "budget_count": 5
}
```

#### `PUT /api/simulations/[id]`

Updates simulation metadata (name and description).

**Request Body:**

```json
{
  "name": "Updated Simulation Name",
  "description": "Updated description"
}
```

#### `DELETE /api/simulations/[id]`

Deletes a simulation and all associated budgets.

**Response:**

```json
{
  "success": true,
  "message": "Simulación eliminada exitosamente"
}
```

### Simulation Budgets

#### `GET /api/simulations/[id]/budgets`

Gets all budget entries for a simulation.

**Response:**

```json
[
  {
    "category_id": "uuid-here",
    "category_name": "Alimentación",
    "efectivo_amount": 500.0,
    "credito_amount": 200.0
  }
]
```

#### `PUT /api/simulations/[id]/budgets`

Batch updates simulation budgets using UPSERT logic.

**Request Body:**

```json
{
  "budgets": [
    {
      "category_id": "uuid-here",
      "efectivo_amount": 500.0,
      "credito_amount": 200.0
    }
  ]
}
```

**Validation:**

- `budgets` must be an array
- Each budget must have a valid `category_id`
- `efectivo_amount` and `credito_amount` must be positive numbers
- Categories must exist in the database

## Usage Instructions

1. **Run Migration:**

   ```bash
   curl -X GET http://localhost:3000/api/migrate-simulations
   ```

2. **Create a Simulation:**

   ```bash
   curl -X POST http://localhost:3000/api/simulations \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Simulation", "description": "My test"}'
   ```

3. **Set Budget Data:**
   ```bash
   curl -X PUT http://localhost:3000/api/simulations/1/budgets \
     -H "Content-Type: application/json" \
     -d '{"budgets": [{"category_id": "uuid", "efectivo_amount": 500, "credito_amount": 200}]}'
   ```

## Error Handling

All endpoints include comprehensive error handling with Spanish error messages:

- **400 Bad Request** - Validation errors, invalid data
- **404 Not Found** - Simulation or category not found
- **500 Internal Server Error** - Database or server errors

## Performance Considerations

- Indexes are optimized for common query patterns
- UPSERT operations minimize database round trips
- Batch budget updates reduce API calls
- CASCADE deletes ensure data consistency
