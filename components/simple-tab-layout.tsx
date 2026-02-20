'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { useTabs } from '@/components/tabs/tab-context';
import { TabBar } from '@/components/tabs/tab-bar';
import { SimpleTabContent } from '@/components/tabs/simple-tab-content';
import { TabDebugInfo } from '@/components/tabs/tab-debug';
import { useSplitView } from '@/hooks/use-split-view';
import { SplitViewPanel } from '@/components/split-view-panel';

export function SimpleTabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const { tabs, activeTabId, switchTab, removeTab, addTab, pinTab } = useTabs();
  const { splitState, setPanelCount, setPanelRoute, closePanel } =
    useSplitView();

  console.log('SimpleTabLayout render:', {
    isAuthenticated,
    pathname,
    tabsCount: tabs.length,
    activeTabId,
  });

  // Don't show sidebar on login page or when not authenticated
  const isLoginPage = pathname === '/login';
  const showSidebar = isAuthenticated && !isLoginPage;

  const handleTabClick = (tabId: string) => {
    switchTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    removeTab(tabId);
  };

  const handleAddTab = () => {
    addTab('/', 'New Tab');
  };

  const handleTabPin = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.isPinned) {
      // For now, we'll just pin tabs
      pinTab(tabId);
    } else {
      pinTab(tabId);
    }
  };

  const isSplit = splitState.panelCount > 1;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {showSidebar && <AppSidebar />}

      {/* Main content area with tabs */}
      <main
        className={`min-h-0 flex-1 ${
          isSplit
            ? splitState.panelCount === 3
              ? 'grid grid-cols-3 grid-rows-1'
              : 'grid grid-cols-2 grid-rows-1'
            : 'flex flex-col'
        } ${showSidebar ? 'border-l' : ''}`}
      >
        {/* Primary panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Tab bar - always visible when authenticated */}
          {showSidebar && (
            <div className="border-b bg-background">
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={handleTabClick}
                onTabClose={handleTabClose}
                onAddTab={handleAddTab}
                onTabPin={handleTabPin}
                onTabContextMenu={(tabId, event) => {
                  console.log('Context menu for tab:', tabId);
                }}
                splitPanelCount={splitState.panelCount}
                onSplitChange={setPanelCount}
              />
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-auto">
            {showSidebar ? (
              // When authenticated, show tab content system
              <SimpleTabContent
                tabs={tabs}
                activeTabId={activeTabId}
                onTabStateChange={(tabId, state) => {
                  console.log('Tab state changed:', tabId, state);
                }}
              >
                {children}
              </SimpleTabContent>
            ) : (
              // When not authenticated, show regular content
              <div className="p-6">{children}</div>
            )}
          </div>
        </div>

        {/* Extra panels for split view */}
        {isSplit &&
          splitState.panels.map((panel, index) => (
            <SplitViewPanel
              key={index}
              route={panel.route}
              onRouteChange={(newRoute) => setPanelRoute(index, newRoute)}
              onClose={() => closePanel(index)}
              className="flex-1"
            />
          ))}
      </main>

      {/* Debug info in development */}
      <TabDebugInfo />
    </div>
  );
}
