// Tab system types and interfaces

export interface TabState {
  // Store view-specific state to preserve when switching tabs
  scrollPosition?: number;
  currentPath?: string;
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  selectedItems?: string[];
  // Dynamic view-specific state
  viewState?: Record<string, any>;
  // Page-specific data that should be preserved
  pageData?: any;
}

export interface Tab {
  id: string;
  title: string;
  path: string;
  isActive: boolean;
  isPinned?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  state?: TabState;
  createdAt: Date;
  lastAccessed: Date;
  // Additional metadata for tab management
  isModified?: boolean;
  isClosable?: boolean;
  // For dynamic routes
  routeParams?: Record<string, string>;
}

export interface TabsContextType {
  // Tab data
  tabs: Tab[];
  activeTabId: string | null;

  // Tab operations
  addTab: (
    path: string,
    title?: string,
    state?: TabState,
    options?: TabOptions
  ) => string;
  removeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabState: (tabId: string, state: Partial<TabState>) => void;

  // Tab management
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (keepTabId: string) => void;
  duplicateTab: (tabId: string) => string;

  // Tab state
  getTabById: (tabId: string) => Tab | undefined;
  getActiveTab: () => Tab | undefined;

  // Persistence
  saveTabs: () => void;
  loadTabs: () => void;
  clearTabs: () => void;
}

export interface TabOptions {
  isPinned?: boolean;
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  routeParams?: Record<string, string>;
  isClosable?: boolean;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
  onTabPin: (tabId: string) => void;
  onTabContextMenu?: (tabId: string, event: React.MouseEvent) => void;
  // Split view props
  splitPanelCount?: 1 | 2 | 3;
  onSplitChange?: (count: 1 | 2 | 3) => void;
}

export interface TabProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onPin: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  showCloseButton: boolean;
  isDragging?: boolean;
}

export interface TabContentProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabStateChange: (tabId: string, state: Partial<TabState>) => void;
}

export interface TabContextMenuProps {
  tab: Tab;
  onClose: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  position: { x: number; y: number };
}

// Route configuration for tab system
export interface RouteConfig {
  path: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isClosable?: boolean;
  requiresAuth?: boolean;
}

// Tab persistence data
export interface TabStorageData {
  tabs: Omit<Tab, 'createdAt' | 'lastAccessed'>[];
  activeTabId: string | null;
  timestamp: number;
}

// Keyboard shortcuts
export interface TabKeyboardShortcuts {
  addTab: string;
  closeTab: string;
  nextTab: string;
  previousTab: string;
  pinTab: string;
}
