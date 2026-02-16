'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Tab, TabsContextType, TabOptions, TabStorageData } from '@/types/tabs';
import {
  generateTabId,
  getTabTitle,
  getTabIcon,
  isRouteClosable,
  validateTabData,
} from '@/utils/tab-utils';

// Tab state actions
type TabAction =
  | { type: 'ADD_TAB'; payload: { tab: Tab; makeActive?: boolean } }
  | { type: 'REMOVE_TAB'; payload: { tabId: string } }
  | { type: 'SWITCH_TAB'; payload: { tabId: string } }
  | {
      type: 'UPDATE_TAB_STATE';
      payload: { tabId: string; state: Partial<Tab['state']> };
    }
  | { type: 'PIN_TAB'; payload: { tabId: string } }
  | { type: 'UNPIN_TAB'; payload: { tabId: string } }
  | { type: 'CLOSE_ALL_TABS' }
  | { type: 'CLOSE_OTHER_TABS'; payload: { keepTabId: string } }
  | { type: 'DUPLICATE_TAB'; payload: { tabId: string; newTabId: string } }
  | { type: 'LOAD_TABS'; payload: { tabs: Tab[]; activeTabId: string | null } }
  | { type: 'CLEAR_TABS' }
  | { type: 'UPDATE_TAB_ACCESS'; payload: { tabId: string } };

// Tab state reducer
function tabReducer(tabs: Tab[], action: TabAction): Tab[] {
  switch (action.type) {
    case 'ADD_TAB': {
      const { tab, makeActive = true } = action.payload;

      // Check if tab with same path already exists
      const existingTab = tabs.find((t) => t.path === tab.path);
      if (existingTab) {
        // Make existing tab active if requested
        if (makeActive) {
          return tabs.map((t) => ({
            ...t,
            isActive: t.id === existingTab.id,
            lastAccessed: t.id === existingTab.id ? new Date() : t.lastAccessed,
          }));
        }
        return tabs;
      }

      // Add new tab and make it active
      const updatedTabs = tabs.map((t) => ({ ...t, isActive: false }));
      const newTab = {
        ...tab,
        isActive: makeActive,
        isClosable: tab.isClosable ?? isRouteClosable(tab.path),
        lastAccessed: new Date(),
      };

      return [...updatedTabs, newTab];
    }

    case 'REMOVE_TAB': {
      const { tabId } = action.payload;
      const tabIndex = tabs.findIndex((t) => t.id === tabId);

      if (tabIndex === -1) return tabs;

      const tabToRemove = tabs[tabIndex];

      // Don't remove if tab is pinned
      if (tabToRemove.isPinned) return tabs;

      const newTabs = tabs.filter((t) => t.id !== tabId);

      // If we removed the active tab, make another tab active
      if (tabToRemove.isActive && newTabs.length > 0) {
        // Prefer the previous tab, or the first available tab
        const nextActiveIndex = Math.max(0, tabIndex - 1);
        newTabs[nextActiveIndex] = {
          ...newTabs[nextActiveIndex],
          isActive: true,
          lastAccessed: new Date(),
        };
      }

      return newTabs;
    }

    case 'SWITCH_TAB': {
      const { tabId } = action.payload;

      return tabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
        lastAccessed: tab.id === tabId ? new Date() : tab.lastAccessed,
      }));
    }

    case 'UPDATE_TAB_STATE': {
      const { tabId, state } = action.payload;

      return tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              state: { ...tab.state, ...state },
              isModified: true,
              lastAccessed: new Date(),
            }
          : tab
      );
    }

    case 'PIN_TAB': {
      const { tabId } = action.payload;

      return tabs.map((tab) =>
        tab.id === tabId ? { ...tab, isPinned: true, isClosable: false } : tab
      );
    }

    case 'UNPIN_TAB': {
      const { tabId } = action.payload;

      return tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, isPinned: false, isClosable: isRouteClosable(tab.path) }
          : tab
      );
    }

    case 'CLOSE_ALL_TABS': {
      // Keep only pinned tabs
      return tabs
        .filter((tab) => tab.isPinned)
        .map((tab) => ({
          ...tab,
          isActive: false,
        }));
    }

    case 'CLOSE_OTHER_TABS': {
      const { keepTabId } = action.payload;

      // Keep the specified tab and all pinned tabs
      return tabs
        .filter((tab) => tab.id === keepTabId || tab.isPinned)
        .map((tab) => ({
          ...tab,
          isActive: tab.id === keepTabId,
        }));
    }

    case 'DUPLICATE_TAB': {
      const { tabId, newTabId } = action.payload;

      const originalTab = tabs.find((t) => t.id === tabId);
      if (!originalTab) return tabs;

      const duplicatedTab: Tab = {
        ...originalTab,
        id: newTabId,
        title: `${originalTab.title} (Copy)`,
        isActive: false,
        isPinned: false,
        createdAt: new Date(),
        lastAccessed: new Date(),
        isModified: false,
      };

      // Deactivate all tabs and add the duplicated one
      const updatedTabs = tabs.map((t) => ({ ...t, isActive: false }));
      return [...updatedTabs, duplicatedTab];
    }

    case 'UPDATE_TAB_ACCESS': {
      const { tabId } = action.payload;

      return tabs.map((tab) =>
        tab.id === tabId ? { ...tab, lastAccessed: new Date() } : tab
      );
    }

    case 'LOAD_TABS': {
      const { tabs: loadedTabs, activeTabId } = action.payload;

      // Validate loaded tabs
      const validTabs = loadedTabs.filter(validateTabData).map((tab) => ({
        ...tab,
        createdAt: new Date(tab.createdAt),
        lastAccessed: new Date(tab.lastAccessed),
        isActive: tab.id === activeTabId,
      }));

      // Ensure we have at least one active tab
      if (validTabs.length > 0 && !validTabs.some((t) => t.isActive)) {
        validTabs[0].isActive = true;
      }

      return validTabs;
    }

    case 'CLEAR_TABS': {
      return [];
    }

    default:
      return tabs;
  }
}

// Create the tab context
const TabsContext = createContext<TabsContextType | undefined>(undefined);

// Storage keys
const TABS_STORAGE_KEY = 'budget-tracker-tabs';
const ACTIVE_TAB_STORAGE_KEY = 'budget-tracker-active-tab';

// Tab provider component
export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, dispatch] = useReducer(tabReducer, []);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Get active tab ID from tabs
  const getActiveTabId = useCallback(() => {
    const activeTab = tabs.find((tab) => tab.isActive);
    return activeTab?.id || null;
  }, [tabs]);

  // Update active tab ID when tabs change
  useEffect(() => {
    setActiveTabId(getActiveTabId());
  }, [tabs, getActiveTabId]);

  // Sync with current route
  useEffect(() => {
    // Don't create tabs for login page
    if (pathname === '/login') {
      return;
    }

    if (pathname && tabs.length === 0) {
      // Initialize with current route if no tabs exist
      console.log('Initializing first tab for path:', pathname);
      addTab(pathname);
    } else if (pathname) {
      // Check if current route exists in tabs
      const existingTab = tabs.find((tab) => tab.path === pathname);
      if (existingTab && existingTab.id !== activeTabId) {
        switchTab(existingTab.id);
      } else if (!existingTab) {
        // Add new tab for current route (but not for login)
        console.log('Adding new tab for path:', pathname);
        addTab(pathname);
      }
    }
  }, [pathname]);

  // Add tab function
  const addTab = useCallback(
    (
      path: string,
      title?: string,
      state?: Tab['state'],
      options: TabOptions = {}
    ): string => {
      // Don't allow tabs for login page
      if (path === '/login') {
        console.warn('Cannot create tab for login page');
        return '';
      }

      console.log('addTab called with:', { path, title, options });

      const tabId = generateTabId();
      const newTab: Tab = {
        id: tabId,
        title: title || getTabTitle(path),
        path,
        isActive: options.isActive ?? true,
        isPinned: options.isPinned ?? false,
        // Temporarily disable icons to avoid rendering issues
        icon: undefined, // options.icon || getTabIcon(path),
        state,
        createdAt: new Date(),
        lastAccessed: new Date(),
        isClosable: options.isClosable ?? isRouteClosable(path),
        routeParams: options.routeParams,
      };

      console.log('Creating new tab:', newTab);
      dispatch({ type: 'ADD_TAB', payload: { tab: newTab, makeActive: true } });

      // Navigate to the new tab's path
      if (router && path !== pathname) {
        console.log('Navigating to:', path);
        router.push(path);
      }

      return tabId;
    },
    [router, pathname]
  );

  // Remove tab function
  const removeTab = useCallback((tabId: string) => {
    dispatch({ type: 'REMOVE_TAB', payload: { tabId } });
  }, []);

  // Switch tab function
  const switchTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        dispatch({ type: 'SWITCH_TAB', payload: { tabId } });

        // Navigate to the tab's path
        if (router && tab.path !== pathname) {
          router.push(tab.path);
        }
      }
    },
    [tabs, router, pathname]
  );

  // Update tab state function
  const updateTabState = useCallback(
    (tabId: string, state: Partial<Tab['state']>) => {
      dispatch({ type: 'UPDATE_TAB_STATE', payload: { tabId, state } });
    },
    []
  );

  // Pin tab function
  const pinTab = useCallback((tabId: string) => {
    dispatch({ type: 'PIN_TAB', payload: { tabId } });
  }, []);

  // Unpin tab function
  const unpinTab = useCallback((tabId: string) => {
    dispatch({ type: 'UNPIN_TAB', payload: { tabId } });
  }, []);

  // Close all tabs function
  const closeAllTabs = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_TABS' });
  }, []);

  // Close other tabs function
  const closeOtherTabs = useCallback((keepTabId: string) => {
    dispatch({ type: 'CLOSE_OTHER_TABS', payload: { keepTabId } });
  }, []);

  // Duplicate tab function
  const duplicateTab = useCallback((tabId: string): string => {
    const newTabId = generateTabId();
    dispatch({ type: 'DUPLICATE_TAB', payload: { tabId, newTabId } });
    return newTabId;
  }, []);

  // Get tab by ID function
  const getTabById = useCallback(
    (tabId: string): Tab | undefined => {
      return tabs.find((tab) => tab.id === tabId);
    },
    [tabs]
  );

  // Get active tab function
  const getActiveTab = useCallback((): Tab | undefined => {
    return tabs.find((tab) => tab.isActive);
  }, [tabs]);

  // Save tabs to localStorage
  const saveTabs = useCallback(() => {
    try {
      const tabData: TabStorageData = {
        tabs: tabs.map(({ createdAt, lastAccessed, ...tab }) => ({
          ...tab,
          createdAt: createdAt.toISOString(),
          lastAccessed: lastAccessed.toISOString(),
        })),
        activeTabId: getActiveTabId(),
        timestamp: Date.now(),
      };

      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabData));
      if (activeTabId) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
      }
    } catch (error) {
      console.error('Failed to save tabs:', error);
    }
  }, [tabs, activeTabId, getActiveTabId]);

  // Load tabs from localStorage
  const loadTabs = useCallback(() => {
    try {
      const stored = localStorage.getItem(TABS_STORAGE_KEY);
      if (stored) {
        const tabData: TabStorageData = JSON.parse(stored);

        // Only load if data is recent (within 24 hours)
        const isRecent = Date.now() - tabData.timestamp < 24 * 60 * 60 * 1000;

        if (isRecent) {
          dispatch({
            type: 'LOAD_TABS',
            payload: {
              tabs: tabData.tabs.map((tab) => ({
                ...tab,
                createdAt: new Date(tab.createdAt || Date.now()),
                lastAccessed: new Date(tab.lastAccessed || Date.now()),
              })),
              activeTabId: tabData.activeTabId,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  }, []);

  // Clear tabs function
  const clearTabs = useCallback(() => {
    dispatch({ type: 'CLEAR_TABS' });
    localStorage.removeItem(TABS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
  }, []);

  // Auto-save tabs when they change
  useEffect(() => {
    if (tabs.length > 0) {
      const timeoutId = setTimeout(saveTabs, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [tabs, saveTabs]);

  // Load tabs on mount
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // Clean up login tabs after loading
  useEffect(() => {
    // Only run this once after tabs are loaded
    if (tabs.length > 0) {
      const loginTabs = tabs.filter((tab) => tab.path === '/login');
      if (loginTabs.length > 0) {
        console.log('Cleaning up login tabs:', loginTabs.length);
        loginTabs.forEach((tab) => {
          dispatch({ type: 'REMOVE_TAB', payload: { tabId: tab.id } });
        });
      }
    }
  }, []); // Empty dependency array to run only once

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      // Tab switching will be handled by the pathname effect
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const contextValue: TabsContextType = {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    switchTab,
    updateTabState,
    pinTab,
    unpinTab,
    closeAllTabs,
    closeOtherTabs,
    duplicateTab,
    getTabById,
    getActiveTab,
    saveTabs,
    loadTabs,
    clearTabs,
  };

  return (
    <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>
  );
}

// Hook to use tabs context
export function useTabs() {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}
