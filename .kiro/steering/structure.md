# Project Structure

## Directory Organization

### `/app` - Next.js App Router

- **Pages**: Route-based pages using Next.js 13+ App Router
- **API Routes**: RESTful endpoints in `/app/api/`
- **Layout**: Root layout with providers and global styles

### `/components` - React Components

- **UI Components**: Reusable Radix UI components in `/components/ui/`
- **Feature Components**: Business logic components (views, dialogs, charts)
- **Layout Components**: Sidebar, conditional layout, theme provider

### `/lib` - Utilities & Configuration

- **Database**: Connection handling and query utilities
- **Auth**: Authentication context and utilities
- **Utils**: Helper functions and shared utilities

### `/context` - React Context

- **Budget Context**: Global state management for budget data
- **Auth Context**: User authentication state

### `/hooks` - Custom React Hooks

- **UI Hooks**: Mobile detection, toast notifications
- **Business Logic**: Custom hooks for data fetching and state

## Naming Conventions

### Files & Directories

- **kebab-case** for file and directory names
- **PascalCase** for React component files
- **camelCase** for utility functions and variables

### Routes & API

- **Spanish route names**: `/gastos`, `/ingresos`, `/categorias`, `/periodos`
- **RESTful API structure**: `/api/[resource]/route.ts`
- **Dynamic routes**: `[id]` for single resource, `[periodId]` for nested resources

### Components

- **Feature suffix**: `-view` for page components, `-dialog` for modals
- **UI prefix**: `ui/` directory for reusable components
- **Descriptive names**: `csv-import-dialog-enhanced.tsx`

## Architecture Patterns

### Data Flow

1. **API Routes** handle database operations
2. **Context Providers** manage global state
3. **Custom Hooks** encapsulate data fetching
4. **View Components** render UI and handle user interactions

### Database Access

- **Centralized client**: `lib/db.ts` exports configured SQL client
- **Error handling**: Retry logic with exponential backoff
- **Connection management**: Safe client creation with fallbacks

### Component Structure

- **Protected Routes**: Wrap pages requiring authentication
- **Conditional Layout**: Different layouts for auth vs main app
- **Provider Hierarchy**: Theme → Auth → Budget → Sidebar → UI

### Styling Approach

- **Tailwind classes** for styling
- **CSS variables** for theme colors
- **Responsive design** with mobile-first approach
- **Dark/light theme** support throughout

## Key Patterns

### API Route Structure

```typescript
export async function GET() {
  try {
    const data = await sql`SELECT * FROM table`;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Component Export Pattern

```typescript
export function ComponentName() {
  // Component logic
}
```

### Database Query Pattern

```typescript
const results = await sql`
  SELECT column1, column2 
  FROM table 
  WHERE condition = ${value}
`;
```
