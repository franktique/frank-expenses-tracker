# Multi-Tab Navigation System Integration Guide

## Overview

This guide explains how to integrate the multi-tab navigation system into your Budget Tracker application. The system provides a professional tabbed interface with state management, persistence, and accessibility features.

## Quick Start

### 1. Update Root Layout

Replace your existing layout with the tab-enabled version:

```tsx
// app/layout.tsx
import { TabProvider } from '@/components/tabs';
import { EnhancedConditionalLayout } from '@/components/enhanced-conditional-layout';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <ActivePeriodErrorBoundary showGlobalErrors={true}>
              <BudgetProvider>
                <SidebarProvider>
                  <TabProvider>
                    <EnhancedConditionalLayout>
                      {children}
                    </EnhancedConditionalLayout>
                    <Toaster />
                  </TabProvider>
                </SidebarProvider>
              </BudgetProvider>
            </ActivePeriodErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Use Tab-Aware Components

Replace the existing conditional layout:

```tsx
// Before
import { ConditionalLayout } from '@/components/conditional-layout';

// After
import { EnhancedConditionalLayout } from '@/components/enhanced-conditional-layout';
```

## Core Features

### Tab Management

- **Add Tabs**: Click sidebar items or use Ctrl+T
- **Close Tabs**: Click X button or use Ctrl+W
- **Pin Tabs**: Pin important tabs to prevent closing
- **Duplicate Tabs**: Right-click → Duplicate or Ctrl+D
- **Reorder Tabs**: Drag and drop (future enhancement)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+T | New tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+1-9 | Go to tab 1-9 |
| Ctrl+D | Duplicate tab |
| Ctrl+P | Pin/unpin tab |
| Alt+← | Browser back |
| Alt+→ | Browser forward |
| F5 | Refresh tab |

### State Persistence

- **Automatic Save**: Tabs and states saved to localStorage
- **Restore on Refresh**: Tabs restored when reopening app
- **Closed Tab History**: Recently closed tabs can be restored
- **Tab States**: Scroll position, form data, and filters preserved

### Accessibility

- **Screen Reader Support**: Full ARIA label support
- **Keyboard Navigation**: Complete keyboard control
- **High Contrast Mode**: Compatible with high contrast themes
- **Color Blind Friendly**: Multiple color schemes available
- **Focus Management**: Proper focus trapping and indicators

## Advanced Integration

### Custom Tab Content

For specific pages, you can customize how tab content is rendered:

```tsx
// app/simular/[id]/page.tsx
import { TabLayoutWrapper } from '@/components/tabs';

export default function SimulationPage({ params }: { params: { id: string } }) {
  return (
    <TabLayoutWrapper showTabBar={true}>
      <SimulationContent simulationId={params.id} />
    </TabLayoutWrapper>
  );
}
```

### Tab State Management

Access and manipulate tab states programmatically:

```tsx
import { useTabs } from '@/components/tabs';

function MyComponent() {
  const {
    tabs,
    activeTabId,
    updateTabState,
    getTabById,
    addTab,
    switchTab
  } = useTabs();

  const saveFormData = (data: any) => {
    if (activeTabId) {
      updateTabState(activeTabId, { formData: data });
    }
  };

  const openInNewTab = (path: string) => {
    const tabId = addTab(path, "Custom Title");
    switchTab(tabId);
  };

  return (
    // Your component content
  );
}
```

### Sidebar Integration

The tab-aware sidebar automatically integrates with the tab system:

```tsx
import { TabAwareSidebar } from '@/components/tabs';

// In your layout
<TabAwareSidebar />
```

### Keyboard Shortcuts Hook

Add custom keyboard shortcuts:

```tsx
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

function MyComponent() {
  const { shortcuts } = useKeyboardShortcuts({
    enabled: true,
    preventDefault: true
  });

  // Shortcuts are automatically registered
  return <div>My Content</div>;
}
```

## Configuration Options

### Tab System Preferences

```tsx
// Customize tab behavior
const tabPreferences = {
  enableTabs: true,
  maxTabs: 20,
  persistState: true,
  enableAnimations: true,
  showTabCloseButtons: true,
  defaultTabBehavior: 'replace' // 'replace' | 'new'
};
```

### Persistence Configuration

```tsx
import { TabPersistenceManager } from '@/utils/tab-persistence';

const persistence = new TabPersistenceManager({
  maxTabs: 50,
  maxClosedTabs: 20,
  maxStorageAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableCompression: false,
  enableEncryption: false
});
```

## Mobile Support

The tab system includes mobile-specific components:

```tsx
import { ResponsiveTabLayout } from '@/components/tabs';

// Automatically switches to mobile layout on small screens
<ResponsiveTabLayout>
  {children}
</ResponsiveTabLayout>
```

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { TabProvider, useTabs } from '@/components/tabs';

// Mock component for testing
function TestComponent() {
  const { tabs, addTab, activeTabId } = useTabs();

  return (
    <div>
      <button onClick={() => addTab('/test', 'Test Tab')}>
        Add Tab
      </button>
      <div data-testid="tab-count">{tabs.length}</div>
      <div data-testid="active-tab">{activeTabId}</div>
    </div>
  );
}

test('should add and switch tabs', () => {
  render(
    <TabProvider>
      <TestComponent />
    </TabProvider>
  );

  fireEvent.click(screen.getByText('Add Tab'));

  expect(screen.getByTestId('tab-count')).toHaveTextContent('1');
  expect(screen.getByTestId('active-tab')).not.toHaveTextContent('');
});
```

### E2E Tests

```typescript
// playwright tests
import { test, expect } from '@playwright/test';

test('tab navigation', async ({ page }) => {
  await page.goto('/');

  // Add new tab
  await page.click('[data-testid="add-tab-button"]');

  // Check tab is created
  await expect(page.locator('[data-testid="tab-bar"]')).toContainText('New Tab');

  // Switch tabs
  await page.click('text=Dashboard');
  await expect(page).toHaveURL('/');
});
```

## Troubleshooting

### Common Issues

1. **Tabs not persisting**: Check localStorage quota and permissions
2. **Keyboard shortcuts not working**: Ensure focus is not in input fields
3. **Tab content not loading**: Verify route configuration in `tab-utils.ts`
4. **Performance issues**: Enable tab state cleanup and limit max tabs

### Debug Mode

Enable debug logging:

```tsx
// In development
if (process.env.NODE_ENV === 'development') {
  window.debugTabs = true;
}
```

### Browser Compatibility

- **Modern Browsers**: Full support (Chrome 90+, Firefox 88+, Safari 14+)
- **Legacy Browsers**: Basic functionality with polyfills
- **Mobile**: Touch gestures supported on iOS Safari and Android Chrome

## Migration from Single View

To migrate existing navigation:

1. **Install tab system**: Follow integration steps
2. **Update navigation calls**: Replace `router.push()` with `addTab()`
3. **Preserve existing state**: Use `updateTabState()` for form data
4. **Test user flows**: Verify all navigation works as expected

### Before
```tsx
const handleNavigate = () => {
  router.push('/categorias');
};
```

### After
```tsx
const { addTab } = useTabs();

const handleNavigate = () => {
  addTab('/categorias', 'Categorías');
};
```

## Performance Considerations

- **Lazy Loading**: Tab content loads only when activated
- **Memory Management**: Inactive tabs are unmounted to save memory
- **Storage Optimization**: Compress tab data and limit history size
- **Render Optimization**: Use React.memo for tab components

## Future Enhancements

Planned features for future releases:

- **Drag and Drop**: Tab reordering
- **Tab Groups**: Organize tabs into groups
- **Tab Workspaces**: Save and restore tab configurations
- **Collaborative Tabs**: Share tabs between users
- **Advanced Search**: Search across tab content
- **Tab Analytics**: Usage statistics and insights

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review component documentation
3. Create an issue with reproduction steps
4. Join the community discussions

---

*This guide covers the complete integration of the multi-tab navigation system. For specific implementation details, refer to the individual component documentation.*