"use client";

import React from 'react';
import { TabContentProps } from '@/types/tabs';

// Simple tab content that just renders children
export function SimpleTabContent({
  tabs,
  activeTabId,
  onTabStateChange,
  children
}: TabContentProps & { children: React.ReactNode }) {
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (activeTabId) {
      onTabStateChange(activeTabId, {
        scrollPosition: event.currentTarget.scrollTop
      });
    }
  };

  return (
    <div className="h-full">
      {activeTab ? (
        <div
          className="h-full overflow-auto p-6"
          onScroll={handleScroll}
        >
          {children}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">No Active Tab</h2>
            <p className="text-muted-foreground">
              Select a tab or create a new one to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}