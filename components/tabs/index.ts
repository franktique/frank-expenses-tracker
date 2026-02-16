// Tab system components
export { TabProvider, useTabs } from './tab-context';
export {
  Tab as TabComponent,
  EnhancedTab,
  PinnedTab,
  ClosableTab,
  SystemTab,
} from './tab';
export { TabBar, CompactTabBar, DraggableTabBar } from './tab-bar';
export {
  TabContent,
  TabContentWithErrorBoundary,
  MobileTabContent,
  TabContentFactory,
} from './tab-content';

// Layout and navigation
export { TabLayout, ResponsiveTabLayout, TabLayoutWrapper } from './tab-layout';
export { TabAwareSidebar, EnhancedTabAwareSidebar } from './tab-aware-sidebar';

// Tab management
export {
  TabContextMenu,
  TabContextMenuContainer,
  TabManagementPanel,
  TabQuickActions,
} from './tab-context-menu';

// Accessibility
export {
  TabAccessibilityAnnouncer,
  TabKeyboardNavigation,
  TabScreenReaderHelpers,
  TabSkipLink,
  useHighContrastMode,
  useReducedMotion,
  useFocusTrap,
  useColorBlindMode,
  tabAriaLabels,
  tabAriaDescriptions,
  colorBlindFriendlyThemes,
} from './tab-accessibility';

// Re-export types for convenience
export type {
  Tab,
  TabsContextType,
  TabState,
  TabOptions,
  TabBarProps,
  TabProps,
  TabContentProps,
  TabContextMenuProps,
  RouteConfig,
  TabStorageData,
  TabKeyboardShortcuts,
} from '@/types/tabs';

// Re-export utilities
export {
  routeConfig,
  getTabTitle,
  getTabIcon,
  generateTabId,
  isRouteClosable,
  getBaseRoute,
  validateTabData,
} from '@/utils/tab-utils';
