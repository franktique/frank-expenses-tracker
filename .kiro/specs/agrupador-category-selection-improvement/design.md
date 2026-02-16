# Design Document

## Overview

This design improves the agrupador category management interface by replacing the current dropdown-based single selection with a checkbox-based multiple selection system. The solution follows the established pattern used in the estudios page for adding agrupadores, ensuring UI consistency across the application.

## Architecture

### Current Architecture

- Single category selection via Select component dropdown
- Individual API calls for each category addition
- Manual state management for unassigned categories
- No scroll control for long lists

### Proposed Architecture

- Multiple category selection via Checkbox components
- Batch API processing for multiple category additions
- Enhanced state management with selection tracking
- Scrollable container with fixed dialog dimensions

## Components and Interfaces

### Frontend Components

#### Modified GrouperDetailPage Component

**Location:** `app/agrupadores/[id]/page.tsx`

**State Changes:**

```typescript
// Replace single selection state
const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

// With multiple selection state
const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
const [isAddingCategories, setIsAddingCategories] = useState<boolean>(false);
```

**New Handler Functions:**

```typescript
// Handle checkbox selection/deselection
const handleCategorySelection = (categoryId: string, checked: boolean) => {
  if (checked) {
    setSelectedCategoryIds((prev) => [...prev, categoryId]);
  } else {
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  }
};

// Handle batch category addition
const handleAddCategories = async () => {
  // Batch API call implementation
};
```

#### Enhanced Add Category Dialog

**UI Structure:**

```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Agregar Categorías</DialogTitle>
  </DialogHeader>
  <div className="py-4">
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {unassignedCategories.map((category) => (
        <div key={category.id} className="flex items-center space-x-2">
          <Checkbox
            id={`category-${category.id}`}
            checked={selectedCategoryIds.includes(category.id)}
            onCheckedChange={(checked) =>
              handleCategorySelection(category.id, checked as boolean)
            }
          />
          <label htmlFor={`category-${category.id}`}>{category.name}</label>
        </div>
      ))}
    </div>
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={handleCancel}>
      Cancelar
    </Button>
    <Button
      onClick={handleAddCategories}
      disabled={selectedCategoryIds.length === 0 || isAddingCategories}
    >
      {isAddingCategories
        ? "Agregando..."
        : `Agregar (${selectedCategoryIds.length})`}
    </Button>
  </DialogFooter>
</Dialog>
```

### Backend API Enhancement

#### Modified POST Endpoint

**Location:** `app/api/groupers/[id]/categories/route.ts`

**Current Interface:**

```typescript
POST / api / groupers / [id] / categories;
Body: {
  categoryId: string;
}
```

**Enhanced Interface:**

```typescript
POST /api/groupers/[id]/categories
Body: { categoryIds: string[] }
Response: { added: number, skipped: number, errors: string[] }
```

**Implementation Strategy:**

- Maintain backward compatibility with single categoryId
- Add support for categoryIds array
- Implement batch processing with transaction handling
- Return detailed results for user feedback

## Data Models

### Request/Response Models

#### Batch Addition Request

```typescript
interface BatchCategoryRequest {
  categoryIds: string[]; // Array of category UUIDs
}
```

#### Batch Addition Response

```typescript
interface BatchCategoryResponse {
  added: number; // Successfully added categories
  skipped: number; // Already assigned categories
  errors: string[]; // Error messages for failed additions
  addedCategories: Category[]; // Details of successfully added categories
}
```

#### Category Selection State

```typescript
interface CategorySelectionState {
  selectedCategoryIds: string[];
  isAddingCategories: boolean;
  unassignedCategories: Category[];
}
```

## Error Handling

### Frontend Error Handling

1. **Network Errors:** Display connection error messages with retry options
2. **Validation Errors:** Prevent submission when no categories selected
3. **Partial Failures:** Show detailed feedback for batch operations
4. **Loading States:** Disable UI during API operations

### Backend Error Handling

1. **Transaction Rollback:** Ensure data consistency during batch operations
2. **Duplicate Prevention:** Skip already assigned categories gracefully
3. **Validation:** Verify all category IDs exist and are valid UUIDs
4. **Detailed Responses:** Return specific error information for each failed operation

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  details?: {
    categoryId: string;
    reason: string;
  }[];
}
```

## Testing Strategy

### Unit Tests

1. **Component Tests:**
   - Checkbox selection/deselection behavior
   - Button state management (enabled/disabled)
   - Dialog open/close functionality
   - Loading state handling

2. **API Tests:**
   - Batch category addition with valid data
   - Duplicate category handling
   - Invalid category ID handling
   - Transaction rollback on partial failures

### Integration Tests

1. **End-to-End Workflows:**
   - Complete category addition flow
   - Error handling scenarios
   - UI state synchronization
   - Data persistence verification

2. **Performance Tests:**
   - Large category list rendering
   - Batch operation performance
   - Scroll behavior with many items

### Test Data Scenarios

1. **Empty Lists:** No available categories
2. **Large Lists:** 100+ categories for scroll testing
3. **Mixed States:** Some categories already assigned
4. **Error Conditions:** Network failures, invalid data

## Implementation Considerations

### UI/UX Improvements

1. **Scroll Container:** `max-h-96 overflow-y-auto` for category list
2. **Visual Feedback:** Loading spinners and progress indicators
3. **Button States:** Dynamic text showing selection count
4. **Accessibility:** Proper labels and keyboard navigation

### Performance Optimizations

1. **Batch Processing:** Single API call for multiple categories
2. **State Management:** Efficient selection tracking
3. **Rendering:** Virtualization for very large lists (future enhancement)

### Backward Compatibility

1. **API Versioning:** Support both single and batch requests
2. **Graceful Degradation:** Fallback to single operations if needed
3. **Migration Path:** Smooth transition from existing implementation

## Security Considerations

### Input Validation

1. **Category ID Validation:** Ensure all IDs are valid UUIDs
2. **Grouper Authorization:** Verify user has access to modify grouper
3. **Batch Size Limits:** Prevent excessive batch operations

### Data Integrity

1. **Transaction Handling:** Atomic batch operations
2. **Duplicate Prevention:** Database constraints and application logic
3. **Audit Logging:** Track category assignment changes
