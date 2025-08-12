# Category-Fund Relationship API Endpoints

This directory contains the API endpoints for managing many-to-many relationships between categories and funds.

## Endpoints

### GET `/api/categories/[id]/funds`

Retrieves all funds associated with a specific category.

**Parameters:**

- `id` (path): Category UUID

**Response:**

```json
{
  "funds": [
    {
      "id": "uuid",
      "name": "Fund Name",
      "description": "Fund Description",
      "initial_balance": 1000,
      "current_balance": 1000,
      "start_date": "2024-01-01",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `404`: Category not found
- `500`: Server error

### POST `/api/categories/[id]/funds`

Updates the fund relationships for a category. This replaces all existing relationships.

**Parameters:**

- `id` (path): Category UUID

**Request Body:**

```json
{
  "fund_ids": ["fund-uuid-1", "fund-uuid-2"]
}
```

**Response:**

```json
{
  "message": "Category-fund relationships updated successfully",
  "funds": [
    {
      "id": "uuid",
      "name": "Fund Name"
      // ... other fund properties
    }
  ]
}
```

**Error Responses:**

- `400`: Validation failed or some funds don't exist
- `404`: Category not found
- `500`: Server error

### DELETE `/api/categories/[id]/funds/[fund_id]`

Removes a specific fund relationship from a category.

**Parameters:**

- `id` (path): Category UUID
- `fund_id` (path): Fund UUID

**Query Parameters:**

- `force` (optional): Set to `true` to force deletion even when it would leave a category with expenses but no fund restrictions

**Response:**

```json
{
  "message": "Category-fund relationship deleted successfully",
  "deleted_relationship": {
    "category_id": "uuid",
    "fund_id": "uuid"
  },
  "warning": "Optional warning message"
}
```

**Error Responses:**

- `404`: Category, fund, or relationship not found
- `409`: Cannot delete last fund relationship for category with expenses (unless `force=true`)
- `500`: Server error

## Usage Examples

### Get funds for a category

```bash
curl -X GET http://localhost:3000/api/categories/123e4567-e89b-12d3-a456-426614174000/funds
```

### Associate multiple funds with a category

```bash
curl -X POST http://localhost:3000/api/categories/123e4567-e89b-12d3-a456-426614174000/funds \
  -H "Content-Type: application/json" \
  -d '{"fund_ids": ["fund-uuid-1", "fund-uuid-2"]}'
```

### Remove all fund associations (empty array)

```bash
curl -X POST http://localhost:3000/api/categories/123e4567-e89b-12d3-a456-426614174000/funds \
  -H "Content-Type: application/json" \
  -d '{"fund_ids": []}'
```

### Remove a specific fund relationship

```bash
curl -X DELETE http://localhost:3000/api/categories/123e4567-e89b-12d3-a456-426614174000/funds/fund-uuid-1
```

### Force remove the last fund relationship

```bash
curl -X DELETE "http://localhost:3000/api/categories/123e4567-e89b-12d3-a456-426614174000/funds/fund-uuid-1?force=true"
```

## Data Integrity

The API includes several data integrity checks:

1. **Category Validation**: Ensures the category exists before any operation
2. **Fund Validation**: Ensures all specified funds exist before creating relationships
3. **Relationship Validation**: Prevents deletion of relationships that would break data consistency
4. **Expense Protection**: Warns when removing the last fund relationship from a category that has expenses

## Database Schema

The relationships are stored in the `category_fund_relationships` table:

```sql
CREATE TABLE category_fund_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, fund_id)
);
```

## Testing

To test these endpoints manually, you can:

1. Start the development server: `npm run dev`
2. Run the test script: `node scripts/test-category-fund-endpoints.js`
3. Or use the curl examples above with actual UUIDs from your database
