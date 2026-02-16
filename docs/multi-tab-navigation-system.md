# Multi-Tab Navigation System Implementation Plan

## Overview

This document outlines the implementation of a multi-tab navigation system for the Budget Tracker application. The system will allow users to open multiple tabs, switch between different views without reloading, and maintain separate state for each tab.

## Current Architecture Analysis

### Current Navigation Structure

- **Sidebar Navigation**: `components/app-sidebar.tsx` with 15+ menu items
- **Layout System**: `components/conditional-layout.tsx` with sidebar + main content
- **Routing**: Next.js App Router with dynamic routes (e.g., `/simular/[id]`, `/estudios/[id]`)
- **State Management**: React Context (BudgetContext, AuthContext)

### Current Navigation Items

1. Dashboard (`/`)
2. Categorias (`/categorias`)
3. Periodos (`/periodos`)
4. Presupuestos (`/presupuestos`)
5. Ingresos (`/ingresos`)
6. Gastos (`/gastos`)
7. Tarjetas de Crédito (`/tarjetas-credito`)
8. Fondos (`/fondos`)
9. Agrupadores (`/agrupadores`)
10. Estudios (`/estudios`)
11. Simular (`/simular`)
12. Dashboard Groupers (`/dashboard/groupers`)
13. Dashboard Fondos (`/dashboard/fondos`)
14. Dashboard Remanentes (`/dashboard/remainder`)
15. Gastos por Fecha (`/dashboard/category-bars`)
16. Gastos por Periodo (`/dashboard/period-bars`)
17. Overspend Actual (`/dashboard/overspend`)
18. Configuración (`/setup`)

## Proposed Multi-Tab System Architecture

### 1. Tab State Management System

#### Tab Context Structure

```typescript
interface Tab {
  id: string;
  title: string;
  path: string;
  isActive: boolean;
  isPinned?: boolean;
  icon?: React.ReactNode;
  state?: TabState;
  createdAt: Date;
  lastAccessed: Date;
}

interface TabState {
  // Store view-specific state to preserve when switching tabs
  scrollPosition?: number;
  formData?: any;
  filters?: any;
  selectedItems?: any;
  // Add other view-specific states as needed
}

interface TabsContextType {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (path: string, title?: string, state?: TabState) => string;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabState: (tabId: string, state: Partial<TabState>) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (keepTabId: string) => void;
}
```

#### Context Provider Structure

- Create `components/tabs/tab-context.tsx`
- Create `components/tabs/tab-provider.tsx`
- Integrate with existing layout system

### 2. Tab UI Components

#### Tab Bar Component

```typescript
// components/tabs/tab-bar.tsx
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
  onTabPin: (tabId: string) => void;
}
```

**Features:**

- Horizontal scrollable tab list
- Tab close buttons (except for pinned tabs)
- Pin functionality for important tabs
- Add new tab button (+)
- Tab context menu (right-click)
- Draggable tabs (future enhancement)

#### Individual Tab Component

```typescript
// components/tabs/tab.tsx
interface TabProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onPin: () => void;
  showCloseButton: boolean;
}
```

**Features:**

- Display tab title and icon
- Active state highlighting
- Close button (hover state)
- Pin indicator
- Context menu support

### 3. Integration with Current Navigation

#### Modified Sidebar Behavior

- Sidebar clicks will add new tabs instead of direct navigation
- Option to open in new tab vs. replace current tab
- Right-click context menu for "Open in new tab"

#### Enhanced Link Components

- Modify sidebar links to use tab system
- Add "middle-click" support for opening in new tab
- Maintain existing URL structure and deep linking

### 4. Tab Content Management

#### Tab Content Router

```typescript
// components/tabs/tab-content.tsx
interface TabContentProps {
  tabs: Tab[];
  activeTabId: string | null;
}
```

**Features:**

- Render active tab content
- Preserve state of inactive tabs
- Handle tab switching animations
- Lazy loading for better performance

#### Route-to-Tab Mapping

```typescript
const routeConfig = {
  '/': { title: 'Dashboard', icon: Home },
  '/categorias': { title: 'Categorías', icon: PieChart },
  '/periodos': { title: 'Períodos', icon: CalendarRange },
  // ... other routes
};
```

### 5. State Persistence

#### Tab State Persistence

- Save tabs to localStorage/sessionStorage
- Restore tabs on page reload
- Handle browser back/forward buttons
- Deep linking support (shareable tab URLs)

#### Performance Optimizations

- Lazy loading of tab content
- Virtual scrolling for many tabs
- Memory management for inactive tabs
- Debounced state saving

## Implementation Steps

### Phase 1: Foundation ✅

- [x] Create tab context and provider
- [x] Design tab data structures
- [x] Create basic tab components
- [x] Set up tab state management

### Phase 2: UI Implementation ✅

- [x] Build tab bar component
- [x] Create individual tab component
- [x] Add tab styling and animations
- [x] Implement add/remove tab functionality

### Phase 3: Navigation Integration ✅

- [x] Modify sidebar navigation
- [x] Update link components
- [x] Add keyboard shortcuts
- [x] Implement context menus

### Phase 4: Advanced Features ✅

- [x] Add tab pinning
- [x] Implement tab state persistence
- [x] Add keyboard navigation
- [x] Create tab management features

### Phase 5: Polish & Optimization ✅

- [x] Performance optimization
- [x] Accessibility improvements
- [x] Testing and bug fixes
- [x] Documentation updates

## Technical Considerations

### Performance

- Use React.memo for tab components
- Implement virtual scrolling for many tabs
- Lazy load tab content
- Debounce state persistence

### Accessibility

- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast mode support

### Browser Compatibility

- Modern browser features (CSS Grid, Flexbox)
- Fallbacks for older browsers
- Mobile responsive design
- Touch gesture support

### Security

- Validate tab state data
- Sanitize stored tab information
- Handle XSS prevention
- Secure localStorage usage

## File Structure

```
src/
├── components/
│   ├── tabs/
│   │   ├── tab-context.tsx
│   │   ├── tab-provider.tsx
│   │   ├── tab-bar.tsx
│   │   ├── tab.tsx
│   │   ├── tab-content.tsx
│   │   ├── tab-context-menu.tsx
│   │   └── index.ts
│   ├── ui/
│   │   └── ... (existing UI components)
│   └── app-sidebar.tsx (modified)
├── hooks/
│   ├── use-tabs.ts
│   └── use-keyboard-shortcuts.ts
├── types/
│   └── tabs.ts
└── utils/
    ├── tab-utils.ts
    └── navigation-utils.ts
```

## Testing Strategy

### Unit Tests

- Tab context functionality
- Tab component rendering
- Navigation integration
- State persistence

### Integration Tests

- Tab switching behavior
- Sidebar navigation
- Route handling
- Browser back/forward

### End-to-End Tests

- Complete tab workflows
- Keyboard shortcuts
- Context menus
- Performance scenarios

## Future Enhancements

### Advanced Features

- Tab dragging and reordering
- Tab grouping
- Tab duplication
- Tab search/filtering
- Tab workspaces

### Collaboration Features

- Share tab configurations
- Tab templates
- Team workspace tabs
- Export/import tab layouts

## Conclusion

This multi-tab system will significantly improve the user experience by allowing users to:

1. Work with multiple views simultaneously
2. Switch between contexts without losing state
3. Maintain workflow efficiency
4. Customize their workspace

The implementation is designed to be backward compatible and can be rolled out incrementally to ensure stability and user adoption.
