# Design Document

## Overview

The "Estudios" feature introduces a new organizational layer that allows users to create collections of agrupadores (groupers). This feature will consist of a new estudios management page and integration with the existing agrupadores dashboard to provide mandatory filtering capabilities. The design follows the existing application patterns and maintains consistency with the current UI/UX.

## Architecture

### Database Schema

The feature requires two new database tables:

1. **estudios** table:

   - `id` (SERIAL PRIMARY KEY)
   - `name` (VARCHAR NOT NULL)
   - `created_at` (TIMESTAMP DEFAULT NOW())
   - `updated_at` (TIMESTAMP DEFAULT NOW())

2. **estudio_groupers** table (many-to-many relationship):
   - `id` (SERIAL PRIMARY KEY)
   - `estudio_id` (INTEGER REFERENCES estudios(id) ON DELETE CASCADE)
   - `grouper_id` (INTEGER REFERENCES groupers(id) ON DELETE CASCADE)
   - `created_at` (TIMESTAMP DEFAULT NOW())
   - UNIQUE constraint on (estudio_id, grouper_id)

### API Endpoints

Following the existing RESTful API pattern:

1. **Estudios Management**:

   - `GET /api/estudios` - List all estudios with grouper counts
   - `POST /api/estudios` - Create new estudio
   - `PUT /api/estudios/[id]` - Update estudio name
   - `DELETE /api/estudios/[id]` - Delete estudio

2. **Estudio-Grouper Relationships**:

   - `GET /api/estudios/[id]/groupers` - Get groupers for specific estudio
   - `POST /api/estudios/[id]/groupers` - Add groupers to estudio
   - `DELETE /api/estudios/[id]/groupers/[grouperId]` - Remove grouper from estudio

3. **Dashboard Integration**:
   - Modify existing `/api/dashboard/groupers/*` endpoints to accept `estudioId` parameter
   - Filter agrupadores based on selected estudio

## Components and Interfaces

### New Components

1. **EstudiosPage** (`app/estudios/page.tsx`):

   - Main estudios management interface
   - CRUD operations for estudios
   - Similar structure to existing agrupadores page
   - Table view with name, grouper count, and actions

2. **EstudioGroupersPage** (`app/estudios/[id]/page.tsx`):

   - Manage groupers within a specific estudio
   - Add/remove groupers from estudio
   - Similar to category management in groupers

3. **EstudioFilter** (`components/estudio-filter.tsx`):
   - Dropdown filter component for dashboard
   - Mandatory selection with default to first estudio
   - Consistent styling with existing filters

### Modified Components

1. **AppSidebar** (`components/app-sidebar.tsx`):

   - Add "Estudios" menu item between "Agrupadores" and "Dashboard Agrupadores"
   - Use appropriate icon (BookOpen or FolderOpen)

2. **GroupersChartPage** (`app/dashboard/groupers/page.tsx`):
   - Add estudio filter as first filter
   - Modify data fetching to include estudio filtering
   - Maintain filter state across tabs
   - Auto-select first estudio on load

### Data Models

```typescript
type Estudio = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

type EstudioGrouper = {
  id: number;
  estudio_id: number;
  grouper_id: number;
  created_at: string;
};

type EstudioWithGroupers = {
  id: number;
  name: string;
  groupers: Grouper[];
};
```

## Data Models

### Database Relationships

- **Estudios** ↔ **Groupers**: Many-to-many relationship through `estudio_groupers` table
- **Groupers** ↔ **Categories**: Existing many-to-many relationship (unchanged)
- **Categories** ↔ **Expenses**: Existing relationship (unchanged)

### Data Flow

1. **Estudios Management**:

   - User creates/edits/deletes estudios
   - User assigns/removes groupers to/from estudios
   - Multiple groupers can belong to multiple estudios

2. **Dashboard Filtering**:
   - Dashboard loads available estudios
   - Auto-selects first estudio as default
   - Filters groupers based on selected estudio
   - All dashboard tabs share the same estudio filter state

## Error Handling

### Validation Rules

1. **Estudio Creation**:

   - Name is required and must be non-empty string
   - Name should be trimmed of whitespace
   - Duplicate names are allowed (business decision)

2. **Grouper Assignment**:

   - Cannot assign non-existent grouper to estudio
   - Cannot create duplicate estudio-grouper relationships
   - Graceful handling of already-assigned groupers

3. **Dashboard Integration**:
   - Handle case where no estudios exist
   - Handle case where selected estudio is deleted
   - Fallback to first available estudio

### Error Messages

- Spanish language error messages consistent with existing application
- Toast notifications for user feedback
- Loading states for async operations
- Retry mechanisms for network failures

## Testing Strategy

### Unit Tests

1. **API Endpoints**:

   - Test CRUD operations for estudios
   - Test grouper assignment/removal
   - Test error conditions and validation
   - Test SQL injection prevention

2. **Components**:
   - Test estudios management UI
   - Test filter component behavior
   - Test dashboard integration

### Integration Tests

1. **End-to-End Workflows**:

   - Create estudio → Add groupers → View in dashboard
   - Delete estudio → Verify dashboard behavior
   - Filter persistence across dashboard tabs

2. **Database Operations**:
   - Test cascade deletes
   - Test constraint violations
   - Test transaction rollbacks

### Manual Testing Scenarios

1. **User Workflows**:
   - Create multiple estudios with overlapping groupers
   - Navigate between dashboard tabs with different filters
   - Delete estudios and verify dashboard updates
   - Handle edge cases (no estudios, no groupers)

## Implementation Phases

### Phase 1: Database and API Foundation

- Create database tables and migrations
- Implement basic CRUD API endpoints
- Add database constraints and indexes

### Phase 2: Estudios Management UI

- Create estudios management page
- Implement grouper assignment interface
- Add navigation menu item

### Phase 3: Dashboard Integration

- Add estudio filter to dashboard
- Modify existing API endpoints
- Implement filter state management
- Test cross-tab filter persistence

### Phase 4: Polish and Testing

- Error handling improvements
- Loading states and user feedback
- Comprehensive testing
- Documentation updates

## Security Considerations

- Input validation and sanitization
- SQL injection prevention using parameterized queries
- Proper error handling without information leakage
- Consistent with existing application security patterns

## Performance Considerations

- Database indexes on foreign keys
- Efficient queries with proper JOINs
- Caching considerations for frequently accessed data
- Pagination for large datasets (future enhancement)

## Accessibility

- Proper ARIA labels for form controls
- Keyboard navigation support
- Screen reader compatibility
- Consistent with existing accessibility patterns
