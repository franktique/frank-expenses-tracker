"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTabs } from './tab-context';

// Accessibility announcements for screen readers
export function TabAccessibilityAnnouncer() {
  const { tabs, activeTabId } = useTabs();
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab && announcementRef.current) {
      const announcement = `Switched to ${activeTab.title} tab`;
      announcementRef.current.textContent = announcement;
    }
  }, [activeTabId, tabs]);

  return (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Keyboard navigation helper
export function TabKeyboardNavigation() {
  const { tabs, activeTabId, switchTab } = useTabs();
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Register tab reference
  const registerTabRef = (tabId: string, element: HTMLDivElement | null) => {
    tabRefs.current[tabId] = element;
  };

  // Focus management
  const focusTab = (tabId: string) => {
    const element = tabRefs.current[tabId];
    if (element) {
      element.focus();
    }
  };

  // Keyboard navigation within tab bar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeTabId) return;

      const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          switchTab(activeTabId);
          return;
        default:
          return;
      }

      if (nextIndex !== currentIndex) {
        const nextTab = tabs[nextIndex];
        if (nextTab) {
          switchTab(nextTab.id);
          focusTab(nextTab.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, switchTab]);

  return { registerTabRef, focusTab };
}

// High contrast mode support
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Check for high contrast preference
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
}

// Reduced motion support
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Focus trap for tab context menus
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element when trap is activated
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Return focus to the triggering element
        // This would need to be implemented based on your specific use case
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive]);

  return containerRef;
}

// Screen reader helpers
export function TabScreenReaderHelpers() {
  const { tabs, activeTabId } = useTabs();

  return (
    <div className="sr-only">
      {/* Tab list status */}
      <div aria-live="polite" aria-atomic="true">
        {tabs.length > 0 && (
          <p>
            Tab list contains {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}.
            {activeTabId && (
              <> Currently active: {tabs.find(t => t.id === activeTabId)?.title}</>
            )}
          </p>
        )}
      </div>

      {/* Instructions for keyboard users */}
      <div aria-live="polite" aria-atomic="false">
        <p>
          Use left and right arrow keys to navigate tabs.
          Press Enter or Space to activate a tab.
          Press Ctrl+T to open a new tab.
          Press Ctrl+W to close the current tab.
        </p>
      </div>
    </div>
  );
}

// Skip link for tab navigation
export function TabSkipLink() {
  const { tabs } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <a
      href="#tabbar"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-2 rounded-md z-50"
    >
      Skip to tab navigation
    </a>
  );
}

// Color blindness friendly themes
export const colorBlindFriendlyThemes = {
  default: {
    active: '#2563eb',
    hover: '#f1f5f9',
    text: '#1e293b',
    muted: '#64748b'
  },
  protanopia: {
    active: '#0ea5e9',
    hover: '#f0f9ff',
    text: '#0c4a6e',
    muted: '#0369a1'
  },
  deuteranopia: {
    active: '#059669',
    hover: '#ecfdf5',
    text: '#064e3b',
    muted: '#047857'
  },
  tritanopia: {
    active: '#7c3aed',
    hover: '#f5f3ff',
    text: '#4c1d95',
    muted: '#6d28d9'
  }
};

// Hook for colorblind friendly mode
export function useColorBlindMode() {
  const [colorBlindType, setColorBlindType] = useState<keyof typeof colorBlindFriendlyThemes>('default');

  const colors = colorBlindFriendlyThemes[colorBlindType];

  return {
    colors,
    colorBlindType,
    setColorBlindType
  };
}

// ARIA labels and descriptions
export const tabAriaLabels = {
  tab: (title: string, isActive: boolean, isPinned: boolean) =>
    `${title}${isActive ? ', current tab' : ''}${isPinned ? ', pinned' : ''}`,
  tabList: 'Application tabs',
  tabPanel: (title: string) => `Content for ${title} tab`,
  closeButton: 'Close tab',
  pinButton: (isPinned: boolean) => isPinned ? 'Unpin tab' : 'Pin tab',
  addTabButton: 'Add new tab',
  tabContextMenu: 'Tab context menu'
};

export const tabAriaDescriptions = {
  keyboardNavigation: 'Use arrow keys to navigate, Enter to select',
  tabActions: 'Right-click for more options',
  modifiedTab: 'This tab has unsaved changes'
};