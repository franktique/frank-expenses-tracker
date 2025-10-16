"use client";

import { useEffect, useCallback } from 'react';
import { useTabs } from '@/components/tabs/tab-context';
import { useRouter, usePathname } from 'next/navigation';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true, preventDefault = true } = options;
  const {
    addTab,
    removeTab,
    switchTab,
    getActiveTab,
    getTabById,
    duplicateTab,
    pinTab,
    unpinTab,
    closeAllTabs,
    closeOtherTabs,
    tabs
  } = useTabs();
  const router = useRouter();
  const pathname = usePathname();

  // New tab shortcut
  const handleNewTab = useCallback(() => {
    addTab("/", "New Tab");
  }, [addTab]);

  // Close current tab shortcut
  const handleCloseTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.isClosable) {
      removeTab(activeTab.id);
    }
  }, [getActiveTab, removeTab]);

  // Switch to next tab
  const handleNextTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab || tabs.length <= 1) return;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.id);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }, [getActiveTab, tabs, switchTab]);

  // Switch to previous tab
  const handlePreviousTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab || tabs.length <= 1) return;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.id);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    switchTab(tabs[prevIndex].id);
  }, [getActiveTab, tabs, switchTab]);

  // Duplicate current tab
  const handleDuplicateTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (activeTab) {
      duplicateTab(activeTab.id);
    }
  }, [getActiveTab, duplicateTab]);

  // Pin/unpin current tab
  const handlePinTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (activeTab) {
      if (activeTab.isPinned) {
        unpinTab(activeTab.id);
      } else {
        pinTab(activeTab.id);
      }
    }
  }, [getActiveTab, pinTab, unpinTab]);

  // Close other tabs
  const handleCloseOtherTabs = useCallback(() => {
    const activeTab = getActiveTab();
    if (activeTab) {
      closeOtherTabs(activeTab.id);
    }
  }, [getActiveTab, closeOtherTabs]);

  // Reopen last tab (this would need a closed tabs history)
  const handleReopenTab = useCallback(() => {
    // This would require maintaining a history of closed tabs
    console.log('Reopen last tab - would need closed tabs history');
  }, []);

  // Go to specific tab by number (1-9)
  const handleGoToTab = useCallback((tabNumber: number) => {
    if (tabNumber >= 1 && tabNumber <= Math.min(9, tabs.length)) {
      switchTab(tabs[tabNumber - 1].id);
    }
  }, [tabs, switchTab]);

  // Navigate back/forward in browser history
  const handleBrowserBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleBrowserForward = useCallback(() => {
    router.forward();
  }, [router]);

  // Refresh current tab
  const handleRefreshTab = useCallback(() => {
    window.location.reload();
  }, []);

  // Define keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Tab management
    {
      key: 't',
      ctrlKey: true,
      action: handleNewTab,
      description: 'New tab'
    },
    {
      key: 'w',
      ctrlKey: true,
      action: handleCloseTab,
      description: 'Close current tab'
    },
    {
      key: 'Tab',
      ctrlKey: true,
      action: handleNextTab,
      description: 'Next tab'
    },
    {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true,
      action: handlePreviousTab,
      description: 'Previous tab'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: handleDuplicateTab,
      description: 'Duplicate current tab'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: handlePinTab,
      description: 'Pin/unpin current tab'
    },
    {
      key: 'h',
      ctrlKey: true,
      action: handleCloseOtherTabs,
      description: 'Close other tabs'
    },
    {
      key: 'Shift',
      ctrlKey: true,
      action: handleReopenTab,
      description: 'Reopen last tab'
    },

    // Number keys for tab navigation
    {
      key: '1',
      ctrlKey: true,
      action: () => handleGoToTab(1),
      description: 'Go to tab 1'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => handleGoToTab(2),
      description: 'Go to tab 2'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => handleGoToTab(3),
      description: 'Go to tab 3'
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => handleGoToTab(4),
      description: 'Go to tab 4'
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => handleGoToTab(5),
      description: 'Go to tab 5'
    },
    {
      key: '6',
      ctrlKey: true,
      action: () => handleGoToTab(6),
      description: 'Go to tab 6'
    },
    {
      key: '7',
      ctrlKey: true,
      action: () => handleGoToTab(7),
      description: 'Go to tab 7'
    },
    {
      key: '8',
      ctrlKey: true,
      action: () => handleGoToTab(8),
      description: 'Go to tab 8'
    },
    {
      key: '9',
      ctrlKey: true,
      action: () => handleGoToTab(9),
      description: 'Go to tab 9'
    },

    // Browser navigation
    {
      key: 'ArrowLeft',
      altKey: true,
      action: handleBrowserBack,
      description: 'Browser back'
    },
    {
      key: 'ArrowRight',
      altKey: true,
      action: handleBrowserForward,
      description: 'Browser forward'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: handleRefreshTab,
      description: 'Refresh current tab'
    },
    {
      key: 'F5',
      action: handleRefreshTab,
      description: 'Refresh current tab'
    },

    // Address bar (for future implementation)
    {
      key: 'l',
      ctrlKey: true,
      action: () => console.log('Focus address bar - not implemented'),
      description: 'Focus address bar'
    },
    {
      key: 'd',
      ctrlKey: true,
      shiftKey: true,
      action: () => console.log('Focus address bar - not implemented'),
      description: 'Focus address bar'
    }
  ];

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.contentEditable === 'true';

      if (isInputElement) {
        // Allow some shortcuts even in input fields
        const allowedInInput = shortcuts.filter(shortcut =>
          (shortcut.key === 't' && shortcut.ctrlKey) || // Ctrl+T for new tab
          (shortcut.key === 'w' && shortcut.ctrlKey) || // Ctrl+W for close tab
          (shortcut.key === 'Tab' && shortcut.ctrlKey)    // Ctrl+Tab for tab switching
        );

        const matchingShortcut = allowedInInput.find(shortcut =>
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === !!event.ctrlKey &&
          !!shortcut.altKey === !!event.altKey &&
          !!shortcut.shiftKey === !!event.shiftKey &&
          !!shortcut.metaKey === !!event.metaKey
        );

        if (matchingShortcut) {
          event.preventDefault();
          matchingShortcut.action();
        }
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut =>
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === !!event.ctrlKey &&
        !!shortcut.altKey === !!event.altKey &&
        !!shortcut.shiftKey === !!event.shiftKey &&
        !!shortcut.metaKey === !!event.metaKey
      );

      if (matchingShortcut) {
        if (preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, preventDefault, shortcuts]);

  // Return shortcuts info for help/documentation
  return {
    shortcuts,
    enabledShortcuts: enabled ? shortcuts : []
  };
}

// Hook for displaying keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const { enabledShortcuts } = useKeyboardShortcuts({ enabled: false });

  const getShortcutsByCategory = useCallback(() => {
    const categories = {
      'Tab Management': enabledShortcuts.filter(s =>
        s.description.includes('tab') || s.description.includes('Tab')
      ),
      'Navigation': enabledShortcuts.filter(s =>
        s.description.includes('back') ||
        s.description.includes('forward') ||
        s.description.includes('Go to')
      ),
      'Browser Actions': enabledShortcuts.filter(s =>
        s.description.includes('Refresh') ||
        s.description.includes('address')
      )
    };

    return categories;
  }, [enabledShortcuts]);

  return {
    getShortcutsByCategory,
    allShortcuts: enabledShortcuts
  };
}