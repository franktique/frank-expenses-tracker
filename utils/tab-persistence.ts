import { Tab, TabStorageData, TabState } from '@/types/tabs';
import { validateTabData } from './tab-utils';

// Storage keys
export const TABS_STORAGE_KEY = 'budget-tracker-tabs';
export const ACTIVE_TAB_STORAGE_KEY = 'budget-tracker-active-tab';
export const TAB_STATE_STORAGE_KEY = 'budget-tracker-tab-states';
export const TAB_PREFERENCES_KEY = 'budget-tracker-tab-preferences';
export const CLOSED_TABS_HISTORY_KEY = 'budget-tracker-closed-tabs';

// Default storage configuration
const DEFAULT_STORAGE_CONFIG = {
  maxTabs: 50,
  maxClosedTabs: 20,
  maxStorageAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableCompression: false,
  enableEncryption: false
};

// Tab persistence manager
export class TabPersistenceManager {
  private config: typeof DEFAULT_STORAGE_CONFIG;

  constructor(config = DEFAULT_STORAGE_CONFIG) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  // Save tabs to localStorage
  saveTabs(tabs: Tab[], activeTabId: string | null): boolean {
    try {
      // Limit number of tabs to prevent storage issues
      const limitedTabs = tabs.slice(-this.config.maxTabs);

      const storageData: TabStorageData = {
        tabs: limitedTabs.map(tab => this.serializeTab(tab)),
        activeTabId,
        timestamp: Date.now()
      };

      const jsonData = JSON.stringify(storageData);
      localStorage.setItem(TABS_STORAGE_KEY, jsonData);

      if (activeTabId) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
      }

      return true;
    } catch (error) {
      console.error('Failed to save tabs:', error);
      return false;
    }
  }

  // Load tabs from localStorage
  loadTabs(): { tabs: Tab[]; activeTabId: string | null } | null {
    try {
      const storedData = localStorage.getItem(TABS_STORAGE_KEY);
      if (!storedData) return null;

      const storageData: TabStorageData = JSON.parse(storedData);

      // Check if data is too old
      const isRecent = Date.now() - storageData.timestamp < this.config.maxStorageAge;
      if (!isRecent) {
        this.clearExpiredData();
        return null;
      }

      // Validate and deserialize tabs
      const validTabs = storageData.tabs
        .map(tab => this.deserializeTab(tab))
        .filter(Boolean) as Tab[];

      return {
        tabs: validTabs,
        activeTabId: storageData.activeTabId
      };
    } catch (error) {
      console.error('Failed to load tabs:', error);
      return null;
    }
  }

  // Save individual tab state
  saveTabState(tabId: string, state: TabState): boolean {
    try {
      const existingStates = this.loadAllTabStates();
      existingStates[tabId] = {
        ...state,
        timestamp: Date.now()
      };

      localStorage.setItem(TAB_STATE_STORAGE_KEY, JSON.stringify(existingStates));
      return true;
    } catch (error) {
      console.error('Failed to save tab state:', error);
      return false;
    }
  }

  // Load individual tab state
  loadTabState(tabId: string): TabState | null {
    try {
      const allStates = this.loadAllTabStates();
      return allStates[tabId] || null;
    } catch (error) {
      console.error('Failed to load tab state:', error);
      return null;
    }
  }

  // Load all tab states
  loadAllTabStates(): Record<string, TabState & { timestamp: number }> {
    try {
      const stored = localStorage.getItem(TAB_STATE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load tab states:', error);
      return {};
    }
  }

  // Remove tab state
  removeTabState(tabId: string): boolean {
    try {
      const allStates = this.loadAllTabStates();
      delete allStates[tabId];
      localStorage.setItem(TAB_STATE_STORAGE_KEY, JSON.stringify(allStates));
      return true;
    } catch (error) {
      console.error('Failed to remove tab state:', error);
      return false;
    }
  }

  // Save closed tab to history
  saveClosedTab(tab: Tab): boolean {
    try {
      const closedTabs = this.getClosedTabsHistory();

      // Add to beginning of array
      closedTabs.unshift({
        ...this.serializeTab(tab),
        closedAt: Date.now()
      });

      // Limit size of history
      const limitedHistory = closedTabs.slice(0, this.config.maxClosedTabs);

      localStorage.setItem(CLOSED_TABS_HISTORY_KEY, JSON.stringify(limitedHistory));
      return true;
    } catch (error) {
      console.error('Failed to save closed tab:', error);
      return false;
    }
  }

  // Get closed tabs history
  getClosedTabsHistory(): any[] {
    try {
      const stored = localStorage.getItem(CLOSED_TABS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load closed tabs history:', error);
      return [];
    }
  }

  // Restore closed tab
  restoreClosedTab(): Tab | null {
    try {
      const closedTabs = this.getClosedTabsHistory();
      if (closedTabs.length === 0) return null;

      const restoredTabData = closedTabs.shift();
      const restoredTab = this.deserializeTab(restoredTabData);

      // Update history
      localStorage.setItem(CLOSED_TABS_HISTORY_KEY, JSON.stringify(closedTabs));

      return restoredTab;
    } catch (error) {
      console.error('Failed to restore closed tab:', error);
      return null;
    }
  }

  // Save user preferences
  savePreferences(preferences: Record<string, any>): boolean {
    try {
      localStorage.setItem(TAB_PREFERENCES_KEY, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }

  // Load user preferences
  loadPreferences(): Record<string, any> {
    try {
      const stored = localStorage.getItem(TAB_PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return {};
    }
  }

  // Clear all tab-related data
  clearAllData(): boolean {
    try {
      localStorage.removeItem(TABS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
      localStorage.removeItem(TAB_STATE_STORAGE_KEY);
      localStorage.removeItem(TAB_PREFERENCES_KEY);
      localStorage.removeItem(CLOSED_TABS_HISTORY_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear tab data:', error);
      return false;
    }
  }

  // Clear expired data
  clearExpiredData(): boolean {
    try {
      // Clear expired tab states
      const allStates = this.loadAllTabStates();
      const now = Date.now();
      const validStates: Record<string, any> = {};

      Object.entries(allStates).forEach(([tabId, state]) => {
        if (now - state.timestamp < this.config.maxStorageAge) {
          validStates[tabId] = state;
        }
      });

      localStorage.setItem(TAB_STATE_STORAGE_KEY, JSON.stringify(validStates));

      // Clear expired closed tabs
      const closedTabs = this.getClosedTabsHistory();
      const validClosedTabs = closedTabs.filter(tab =>
        now - tab.closedAt < this.config.maxStorageAge
      );

      localStorage.setItem(CLOSED_TABS_HISTORY_KEY, JSON.stringify(validClosedTabs));

      return true;
    } catch (error) {
      console.error('Failed to clear expired data:', error);
      return false;
    }
  }

  // Serialize tab for storage
  private serializeTab(tab: Tab): any {
    return {
      id: tab.id,
      title: tab.title,
      path: tab.path,
      isActive: tab.isActive,
      isPinned: tab.isPinned,
      isModified: tab.isModified,
      isClosable: tab.isClosable,
      state: tab.state,
      createdAt: tab.createdAt.toISOString(),
      lastAccessed: tab.lastAccessed.toISOString(),
      routeParams: tab.routeParams
      // Note: icon function is not serializable and will be lost
    };
  }

  // Deserialize tab from storage
  private deserializeTab(data: any): Tab | null {
    try {
      const tab: Tab = {
        id: data.id,
        title: data.title,
        path: data.path,
        isActive: data.isActive || false,
        isPinned: data.isPinned || false,
        isModified: data.isModified || false,
        isClosable: data.isClosable !== false,
        state: data.state,
        createdAt: new Date(data.createdAt),
        lastAccessed: new Date(data.lastAccessed),
        routeParams: data.routeParams
      };

      // Validate the deserialized tab
      if (!validateTabData(tab)) {
        console.warn('Invalid tab data loaded:', data);
        return null;
      }

      return tab;
    } catch (error) {
      console.error('Failed to deserialize tab:', error);
      return null;
    }
  }

  // Get storage usage statistics
  getStorageStats(): {
    totalSize: number;
    tabsSize: number;
    statesSize: number;
    preferencesSize: number;
    closedTabsSize: number;
    tabCount: number;
    stateCount: number;
    closedTabCount: number;
  } {
    const calculateSize = (key: string): number => {
      const data = localStorage.getItem(key);
      return data ? new Blob([data]).size : 0;
    };

    const tabsData = localStorage.getItem(TABS_STORAGE_KEY);
    const tabCount = tabsData ? JSON.parse(tabsData).tabs?.length || 0 : 0;

    const statesData = localStorage.getItem(TAB_STATE_STORAGE_KEY);
    const stateCount = statesData ? Object.keys(JSON.parse(statesData)).length : 0;

    const closedTabsData = localStorage.getItem(CLOSED_TABS_HISTORY_KEY);
    const closedTabCount = closedTabsData ? JSON.parse(closedTabsData).length : 0;

    return {
      totalSize: calculateSize(TABS_STORAGE_KEY) +
                 calculateSize(TAB_STATE_STORAGE_KEY) +
                 calculateSize(TAB_PREFERENCES_KEY) +
                 calculateSize(CLOSED_TABS_HISTORY_KEY),
      tabsSize: calculateSize(TABS_STORAGE_KEY),
      statesSize: calculateSize(TAB_STATE_STORAGE_KEY),
      preferencesSize: calculateSize(TAB_PREFERENCES_KEY),
      closedTabsSize: calculateSize(CLOSED_TABS_HISTORY_KEY),
      tabCount,
      stateCount,
      closedTabCount
    };
  }
}

// Create default persistence manager instance
export const tabPersistenceManager = new TabPersistenceManager();

// Utility functions for common persistence operations
export const saveTabsToStorage = (tabs: Tab[], activeTabId: string | null) =>
  tabPersistenceManager.saveTabs(tabs, activeTabId);

export const loadTabsFromStorage = () =>
  tabPersistenceManager.loadTabs();

export const saveTabStateToStorage = (tabId: string, state: TabState) =>
  tabPersistenceManager.saveTabState(tabId, state);

export const loadTabStateFromStorage = (tabId: string) =>
  tabPersistenceManager.loadTabState(tabId);

export const saveClosedTabToHistory = (tab: Tab) =>
  tabPersistenceManager.saveClosedTab(tab);

export const restoreClosedTabFromHistory = () =>
  tabPersistenceManager.restoreClosedTab();

export const clearAllTabData = () =>
  tabPersistenceManager.clearAllData();

export const getTabStorageStats = () =>
  tabPersistenceManager.getStorageStats();