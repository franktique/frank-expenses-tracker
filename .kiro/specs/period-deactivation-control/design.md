# Design Document

## Overview

This design enhances the periods management interface by adding period deactivation functionality and improving visual feedback for period activation constraints. The solution builds upon the existing period management system while maintaining consistency with current UI patterns and API structure.

## Architecture

### Current System Analysis

The existing system already implements proper backend logic to ensure only one period is active at a time:

- The `/api/periods/open/[id]` endpoint closes all periods before opening the selected one
- The frontend `openPeriod` function in the budget context handles optimistic updates
- The UI shows activation buttons only for inactive periods

### Enhancement Strategy

The enhancement will:

1. Add a new API endpoint for period deactivation
2. Extend the budget context with a `closePeriod` function
3. Modify the periods view to show appropriate action buttons based on period state
4. Add confirmation dialogs for better user experience

## Components and Interfaces

### API Layer

#### New Endpoint: `/api/periods/close/[id]`

```typescript
// POST /api/periods/close/[id]
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Close the specified period by setting is_open = false
  // Return the updated period
}
```

#### Response Format

```typescript
{
  id: string;
  name: string;
  month: number;
  year: number;
  is_open: false;
}
```

### Context Layer

#### Budget Context Extension

```typescript
// Add to BudgetContextType interface
closePeriod: (id: string) => Promise<void>;

// Implementation will:
// 1. Perform optimistic update (set period as inactive)
// 2. Call the close API endpoint
// 3. Update activePeriod state to null
// 4. Handle errors with rollback
```

### UI Layer

#### Periods View Enhancements

**Action Button Logic:**

- Inactive periods: Show "Activar" button
- Active periods: Show "Desactivar" button
- Loading states: Show appropriate loading text

**Confirmation Dialog:**

- Triggered when activating a period while another is already active
- Shows current active period name and target period name
- Provides clear action buttons (Confirmar/Cancelar)

**Button States:**

```typescript
type PeriodActionState = {
  isActivating: boolean;
  isDeactivating: boolean;
  showConfirmation: boolean;
  targetPeriod?: Period;
  currentActivePeriod?: Period;
};
```

## Data Models

### Period State Management

The existing Period type already supports the required fields:

```typescript
type Period = {
  id: string;
  name: string;
  month: number;
  year: number;
  is_open: boolean;
  isOpen: boolean; // Compatibility property
};
```

### UI State Extensions

```typescript
// Additional state for the PeriodsView component
const [isDeactivating, setIsDeactivating] = useState<string | null>(null);
const [showActivationConfirm, setShowActivationConfirm] = useState(false);
const [targetActivationPeriod, setTargetActivationPeriod] =
  useState<Period | null>(null);
```

## Error Handling

### API Error Scenarios

1. **Period not found**: Return 404 with appropriate message
2. **Database connection issues**: Return 500 with connection error details
3. **Concurrent modifications**: Handle with proper error messages and state refresh

### Frontend Error Handling

1. **Network failures**: Show toast notification and revert optimistic updates
2. **Validation errors**: Display specific error messages from API
3. **State inconsistencies**: Trigger data refresh to resync with backend

### Error Recovery

- Failed operations trigger automatic data refresh
- Toast notifications provide clear feedback
- UI state reverts to previous stable state on errors

## Testing Strategy

### Unit Tests

1. **API Endpoint Tests**

   - Test successful period deactivation
   - Test error scenarios (invalid ID, database errors)
   - Test response format consistency

2. **Context Function Tests**

   - Test `closePeriod` function with mocked API calls
   - Test optimistic updates and error rollback
   - Test state management consistency

3. **Component Tests**
   - Test button rendering based on period state
   - Test confirmation dialog behavior
   - Test loading states and error handling

### Integration Tests

1. **End-to-End Workflows**

   - Test complete activation/deactivation cycle
   - Test switching between periods with confirmation
   - Test error scenarios with proper UI feedback

2. **State Consistency Tests**
   - Verify only one period can be active at a time
   - Test concurrent operation handling
   - Verify UI state matches backend state

### User Experience Tests

1. **Accessibility**

   - Ensure proper ARIA labels for action buttons
   - Test keyboard navigation through confirmation dialogs
   - Verify screen reader compatibility

2. **Responsive Design**
   - Test button layouts on different screen sizes
   - Verify dialog responsiveness
   - Test touch interactions on mobile devices

## Implementation Considerations

### Performance

- Optimistic updates provide immediate UI feedback
- Minimal API calls through efficient state management
- Debounced operations prevent rapid successive calls

### Accessibility

- Clear button labels with loading states
- Proper focus management in confirmation dialogs
- High contrast indicators for period status

### Internationalization

- Spanish labels consistent with existing UI
- Proper date formatting for Colombian locale
- Clear confirmation dialog messages

### Browser Compatibility

- Uses existing React patterns and dependencies
- No new browser APIs required
- Consistent with current Next.js implementation

## Security Considerations

### Input Validation

- Period ID validation in API endpoints
- Proper error handling for malformed requests
- SQL injection prevention through parameterized queries

### Authorization

- Consistent with existing API security patterns
- No additional authentication requirements
- Proper error messages without information leakage

## Migration Strategy

### Backward Compatibility

- No database schema changes required
- Existing API endpoints remain unchanged
- New functionality is purely additive

### Deployment

- Can be deployed incrementally
- No data migration required
- Graceful degradation if new endpoints are unavailable

### Rollback Plan

- New API endpoint can be disabled without affecting existing functionality
- Frontend changes are non-breaking
- Database state remains consistent throughout
