"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { TabProvider } from './tab-context';
import { TabBar } from './tab-bar';
import { TabContent } from './tab-content';
import { useTabs } from './tab-context';
import { TabAwareSidebar } from './tab-aware-sidebar';
import { cn } from '@/lib/utils';

// Tab layout component that wraps the entire application
export function TabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show tabs on login page or when not authenticated
  const isLoginPage = pathname === "/login";
  const showTabs = isAuthenticated && !isLoginPage;

  return (
    <TabProvider>
      <div className="flex min-h-screen">
        {showTabs ? (
          <TabLayoutWithTabs>
            {children}
          </TabLayoutWithTabs>
        ) : (
          <div className="flex-1">
            {children}
          </div>
        )}
      </div>
    </TabProvider>
  );
}

// Layout with tabs enabled
function TabLayoutWithTabs({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TabAwareLayout>
        {children}
      </TabAwareLayout>
    </>
  );
}

// Tab-aware layout that includes sidebar and tab system
function TabAwareLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Don't show sidebar on login page
  const isLoginPage = pathname === "/login";
  const showSidebar = isAuthenticated && !isLoginPage;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {showSidebar && <TabAwareSidebar />}

      {/* Main content area with tabs */}
      <main className={cn(
        "flex flex-col flex-1 min-h-0",
        showSidebar ? "border-l" : ""
      )}>
        {/* Tab bar */}
        <TabBarContainer />

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

// Tab bar container component
function TabBarContainer() {
  const { tabs, activeTabId, switchTab, removeTab, addTab, pinTab } = useTabs();

  const handleTabClick = (tabId: string) => {
    switchTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    removeTab(tabId);
  };

  const handleAddTab = () => {
    // Add a new tab with default route
    addTab("/", "New Tab");
  };

  const handleTabPin = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isPinned) {
      // This would need to be implemented in the context
      console.log('Unpin tab:', tabId);
    } else {
      pinTab(tabId);
    }
  };

  return (
    <TabBar
      tabs={tabs}
      activeTabId={activeTabId}
      onTabClick={handleTabClick}
      onTabClose={handleTabClose}
      onAddTab={handleAddTab}
      onTabPin={handleTabPin}
      onTabContextMenu={(tabId, event) => {
        // Handle context menu (future enhancement)
        console.log('Context menu for tab:', tabId, event);
      }}
    />
  );
}

// Responsive tab layout for mobile
export function ResponsiveTabLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <TabProvider>
        <div className="flex min-h-screen">
          <MobileTabLayout>
            {children}
          </MobileTabLayout>
        </div>
      </TabProvider>
    );
  }

  return <TabLayout>{children}</TabLayout>;
}

// Mobile-specific tab layout
function MobileTabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";
  const showTabs = isAuthenticated && !isLoginPage;

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Mobile sidebar (could be a drawer) */}
      {showTabs && <MobileSidebar />}

      {/* Mobile tab bar */}
      {showTabs && <MobileTabBar />}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Mobile sidebar component
function MobileSidebar() {
  return (
    <div className="bg-card border-b p-4">
      <h2 className="text-lg font-semibold">Budget Tracker</h2>
      <p className="text-sm text-muted-foreground">Mobile navigation</p>
    </div>
  );
}

// Mobile tab bar
function MobileTabBar() {
  const { tabs, activeTabId, switchTab, removeTab, addTab } = useTabs();

  // Limit tabs shown on mobile
  const visibleTabs = tabs.slice(0, 3);

  return (
    <div className="bg-background border-b px-2 py-1">
      <div className="flex items-center gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={cn(
              "px-2 py-1 text-xs rounded-sm whitespace-nowrap transition-colors",
              tab.id === activeTabId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {tab.title}
          </button>
        ))}

        {tabs.length > 3 && (
          <span className="px-2 py-1 text-xs text-muted-foreground">
            +{tabs.length - 3}
          </span>
        )}

        <button
          onClick={() => addTab("/", "New Tab")}
          className="px-2 py-1 text-xs bg-muted rounded-sm hover:bg-accent transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Tab layout wrapper for specific pages
export function TabLayoutWrapper({
  children,
  showTabBar = true
}: {
  children: React.ReactNode;
  showTabBar?: boolean;
}) {
  const { tabs, activeTabId, switchTab, removeTab, addTab, pinTab } = useTabs();

  return (
    <div className="flex flex-col h-full">
      {showTabBar && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={switchTab}
          onTabClose={removeTab}
          onAddTab={addTab}
          onTabPin={pinTab}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <TabContent
          tabs={tabs}
          activeTabId={activeTabId}
          onTabStateChange={(tabId, state) => {
            // Handle tab state changes
            console.log('Tab state changed:', tabId, state);
          }}
        >
          {children}
        </TabContent>
      </div>
    </div>
  );
}