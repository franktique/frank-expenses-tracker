"use client";

import React from 'react';
import { useTabs } from './tab-context';

export function TabDebugInfo() {
  const { tabs, activeTabId, addTab, getActiveTab } = useTabs();

  // Only show in development when explicitly enabled
  if (process.env.NODE_ENV !== 'development' || !process.env.SHOW_TAB_DEBUG) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-background border border-border rounded-lg p-4 text-xs max-w-xs">
      <h3 className="font-semibold mb-2">Tab Debug Info</h3>
      <div className="space-y-1">
        <div>Total tabs: {tabs.length}</div>
        <div>Active tab: {activeTabId || 'None'}</div>
        <div className="max-h-20 overflow-y-auto">
          {tabs.map(tab => (
            <div key={tab.id} className="flex justify-between">
              <span>{tab.title}</span>
              <span>{tab.id === activeTabId ? '✓' : ''}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => addTab('/test', 'Test Tab')}
          className="mt-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
        >
          Add Test Tab
        </button>
      </div>
    </div>
  );
}