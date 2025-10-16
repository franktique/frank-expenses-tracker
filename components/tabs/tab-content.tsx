"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TabContentProps } from '@/types/tabs';
import { useTabs } from './tab-context';

// Lazy loading wrapper for tab content
function LazyTabContent({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}

// State persistence wrapper
function TabStateWrapper({
  tabId,
  children,
  onStateChange
}: {
  tabId: string;
  children: React.ReactNode;
  onStateChange: (tabId: string, state: any) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Save scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (!hasScrolled) {
        setHasScrolled(true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

  // Debounced scroll position saving
  useEffect(() => {
    if (!hasScrolled) return;

    const timeoutId = setTimeout(() => {
      if (scrollContainerRef.current) {
        onStateChange(tabId, {
          scrollPosition: scrollContainerRef.current.scrollTop
        });
        setHasScrolled(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [hasScrolled, tabId, onStateChange]);

  // Restore scroll position
  useEffect(() => {
    // This would be handled by the parent component
    // which has access to the tab state
  }, [tabId]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto">
      {children}
    </div>
  );
}

// Main tab content router
export function TabContent({
  tabs,
  activeTabId,
  onTabStateChange,
  children
}: TabContentProps & { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { updateTabState } = useTabs();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Handle route changes
  useEffect(() => {
    if (pathname && activeTab && activeTab.path !== pathname) {
      setIsTransitioning(true);

      // Update tab state with current path
      updateTabState(activeTab.id, {
        currentPath: pathname,
        lastAccessed: new Date()
      });

      // Clear transition state after a short delay
      const timeoutId = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [pathname, activeTab, updateTabState]);

  // Handle tab state changes
  const handleStateChange = (tabId: string, state: any) => {
    onTabStateChange(tabId, state);
  };

  // For now, just render the children as-is
  // The tab system will handle navigation separately
  const renderTabContent = (tab: any) => {
    if (!tab) return null;

    // Simply return children - the actual page content is handled by Next.js routing
    return (
      <div className="h-full">
        {children}
      </div>
    );
  };

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">No Active Tab</h2>
          <p className="text-muted-foreground">
            Select a tab or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Loading overlay during transitions */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      )}

      {/* Tab content */}
      <TabStateWrapper
        tabId={activeTab.id}
        onStateChange={handleStateChange}
      >
        <LazyTabContent>
          {renderTabContent(activeTab)}
        </LazyTabContent>
      </TabStateWrapper>
    </div>
  );
}

// Tab content with error boundary
export function TabContentWithErrorBoundary(props: TabContentProps) {
  return (
    <div className="h-full">
      <TabContent {...props} />
    </div>
  );
}

// Optimized tab content for mobile
export function MobileTabContent(props: TabContentProps) {
  return (
    <div className="h-full overflow-hidden">
      <TabContent {...props} />
    </div>
  );
}

// Tab content factory for creating specific content types
export const TabContentFactory = {
  // Create dashboard tab content
  createDashboard: (props: any) => (
    <div>Dashboard Component</div>
  ),

  // Create categories tab content
  createCategories: (props: any) => (
    <div>Categories Component</div>
  ),

  // Create periods tab content
  createPeriods: (props: any) => (
    <div>Periods Component</div>
  ),

  // Add more content factories as needed
};