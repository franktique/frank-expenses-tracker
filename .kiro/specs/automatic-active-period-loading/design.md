# Design Document

## Overview

This feature will enhance the user experience by automatically loading the active period when users log in to the Budget Tracker application. Currently, the active period is only loaded when the BudgetProvider initializes, but users must manually navigate to the periods menu to trigger data loading. This design will integrate active period loading directly into the authentication flow and ensure it's stored in session storage for immediate availability across all application sections.

## Architecture

The solution will extend the existing authentication and budget context systems to automatically fetch and store the active period upon successful login. The implementation will leverage the existing API endpoints and context providers while adding session storage persistence for improved performance and user experience.

### Key Components

1. **Enhanced Auth Context**: Extended to trigger active period loading after successful authentication
2. **Session Storage Manager**: Utility functions for managing active period data in session storage
3. **Budget Context Integration**: Modified to check session storage before making API calls
4. **Error Handling**: Robust error handling for period loading failures
5. **Synchronization Logic**: Ensures session storage stays in sync with server state

## Components and Interfaces

### Session Storage Manager

```typescript
interface ActivePeriodStorage {
  loadActivePeriod(): Period | null;
  saveActivePeriod(period: Period): void;
  clearActivePeriod(): void;
  isActivePeriodCached(): boolean;
}
```

### Enhanced Auth Context

The existing `AuthContext` will be extended to include active period loading:

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  activePeriod: Period | null; // New property
  isLoadingActivePeriod: boolean; // New property
}
```

### Budget Context Integration

The `BudgetProvider` will be modified to:

- Check session storage for cached active period on initialization
- Use cached data to provide immediate UI updates
- Validate cached data against server state
- Handle synchronization when period changes occur

### API Integration

The solution will use existing API endpoints:

- `GET /api/periods` - To fetch all periods and identify the active one
- `POST /api/periods/open/[id]` - When users change active periods
- `POST /api/periods/close/[id]` - When users deactivate periods

## Data Models

### Period Model (Existing)

```typescript
interface Period {
  id: string;
  name: string;
  month: number;
  year: number;
  is_open: boolean;
  isOpen: boolean; // Compatibility property
}
```

### Session Storage Schema

```typescript
interface CachedActivePeriod {
  period: Period;
  timestamp: number;
  version: string; // For cache invalidation
}
```

## Error Handling

### Loading Errors

1. **Network Failures**: Retry logic with exponential backoff
2. **Authentication Failures**: Clear session storage and redirect to login
3. **No Active Period**: Display appropriate messaging and guide user to create/activate a period
4. **Invalid Cached Data**: Clear cache and fetch fresh data from server

### Error Recovery

- Graceful degradation when active period loading fails
- Fallback to existing manual period selection workflow
- Clear error messaging to users about system state
- Automatic retry mechanisms for transient failures

### Error States

```typescript
interface PeriodLoadingError {
  type: "network" | "authentication" | "no_active_period" | "invalid_cache";
  message: string;
  retryable: boolean;
  timestamp: number;
}
```

## Testing Strategy

### Unit Tests

1. **Session Storage Manager**

   - Test save/load/clear operations
   - Test cache validation logic
   - Test error handling for storage failures

2. **Auth Context Enhancement**

   - Test active period loading on login
   - Test error handling during period loading
   - Test logout cleanup

3. **Budget Context Integration**
   - Test session storage integration
   - Test cache synchronization
   - Test fallback behavior

### Integration Tests

1. **Login Flow**

   - Test complete login with active period loading
   - Test login with no active period
   - Test login with network failures

2. **Period Management**

   - Test period activation/deactivation synchronization
   - Test session storage updates
   - Test cross-tab synchronization

3. **Error Scenarios**
   - Test network failure recovery
   - Test invalid cache handling
   - Test authentication failure scenarios

### End-to-End Tests

1. **User Journey**

   - Login → Immediate data visibility
   - Period changes → Session storage updates
   - Page refresh → Cached data loading
   - Logout → Cache cleanup

2. **Cross-Browser Testing**
   - Session storage compatibility
   - Error handling consistency
   - Performance across browsers

## Implementation Flow

### Login Enhancement

1. User submits login credentials
2. Authentication API call succeeds
3. Trigger active period loading
4. Fetch periods from API
5. Identify active period
6. Store in session storage
7. Update auth context state
8. Notify budget context of available period

### Session Storage Integration

1. Check session storage on app initialization
2. Validate cached period data
3. Use cached data for immediate UI updates
4. Perform background validation against server
5. Update cache if server data differs
6. Handle cache invalidation scenarios

### Period Change Synchronization

1. User activates/deactivates period
2. API call to update server state
3. Update session storage with new active period
4. Broadcast change to all components
5. Update UI across all sections

### Logout Cleanup

1. User initiates logout
2. Clear authentication state
3. Clear active period from session storage
4. Reset all context states
5. Redirect to login page

## Performance Considerations

### Caching Strategy

- Use session storage for active period data
- Implement cache validation with timestamps
- Background refresh to ensure data consistency
- Minimize API calls through intelligent caching

### Loading Optimization

- Parallel loading of authentication and period data
- Progressive UI updates as data becomes available
- Skeleton loading states during data fetching
- Optimistic updates for better perceived performance

### Memory Management

- Efficient session storage usage
- Cleanup of event listeners and timers
- Proper context state management
- Garbage collection considerations

## Security Considerations

### Data Protection

- No sensitive data stored in session storage
- Period data is not considered sensitive
- Proper cleanup on logout
- Session storage isolation per tab

### Authentication Integration

- Respect existing authentication flow
- Clear period data on authentication failures
- Validate period access permissions
- Handle session expiration gracefully

## Backward Compatibility

### Existing Functionality

- Maintain existing period selection in periods menu
- Preserve all current period management features
- Ensure existing API contracts remain unchanged
- Support existing component interfaces

### Migration Strategy

- Gradual rollout of session storage features
- Fallback to existing behavior on errors
- No breaking changes to existing components
- Maintain existing error handling patterns
