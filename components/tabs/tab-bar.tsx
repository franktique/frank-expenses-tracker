"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TabBarProps } from '@/types/tabs';
import { Tab } from './tab';

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddTab,
  onTabPin,
  onTabContextMenu
}: TabBarProps) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if tabs are overflowing
  const checkOverflow = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setIsOverflowing(scrollWidth > clientWidth);
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  }, []);

  // Check overflow on mount and when tabs change
  useEffect(() => {
    checkOverflow();

    // Add resize listener
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [tabs, checkOverflow]);

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  // Handle tab context menu
  const handleTabContextMenu = useCallback((tabId: string, event: React.MouseEvent) => {
    event.preventDefault();
    onTabContextMenu?.(tabId, event);
  }, [onTabContextMenu]);

  // Handle add tab
  const handleAddTab = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddTab();
  }, [onAddTab]);

  // Handle dropdown menu actions
  const handleNewTab = useCallback(() => {
    onAddTab();
  }, [onAddTab]);

  const handleCloseAllTabs = useCallback(() => {
    // This would need to be passed from parent
    console.log('Close all tabs');
  }, []);

  const handleCloseOtherTabs = useCallback(() => {
    // This would need to be passed from parent
    console.log('Close other tabs');
  }, []);

  // Sort tabs: pinned tabs first, then by last accessed
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return b.lastAccessed.getTime() - a.lastAccessed.getTime();
  });

  return (
    <div className="relative flex items-center bg-background border-b">
      {/* Scroll left button */}
      {showScrollButtons && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="absolute left-0 z-10 h-8 w-8 p-0 rounded-r-none shadow-md"
          aria-label="Scroll tabs left"
        >
          <span className="sr-only">Scroll left</span>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
      )}

      {/* Tab scroll area */}
      <ScrollArea
        ref={scrollAreaRef}
        className={cn(
          "flex-1",
          showScrollButtons && "ml-8"
        )}
      >
        <div
          ref={scrollContainerRef}
          className="flex items-center h-12 gap-1 px-2"
          role="tablist"
          aria-label="Application tabs"
        >
          {sortedTabs.map((tab) => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => onTabClick(tab.id)}
              onClose={() => onTabClose(tab.id)}
              onPin={() => onTabPin(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(tab.id, e)}
              showCloseButton={!tab.isPinned}
            />
          ))}

          {/* Add tab button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTab}
            className={cn(
              "h-8 w-8 p-0 rounded-sm",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-colors duration-200",
              "border border-dashed border-muted-foreground/30",
              "flex items-center justify-center"
            )}
            title="Add new tab"
            aria-label="Add new tab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </ScrollArea>

      {/* Scroll right button */}
      {showScrollButtons && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="absolute right-0 z-10 h-8 w-8 p-0 rounded-l-none shadow-md"
          aria-label="Scroll tabs right"
        >
          <span className="sr-only">Scroll right</span>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Button>
      )}

      {/* More options dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-sm"
            title="More tab options"
            aria-label="More tab options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleNewTab}>
            <Plus className="mr-2 h-4 w-4" />
            New Tab
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCloseOtherTabs}>
            Close Other Tabs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCloseAllTabs}>
            Close All Tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tab count indicator */}
      {tabs.length > 0 && (
        <div className="px-2 text-xs text-muted-foreground">
          {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
        </div>
      )}
    </div>
  );
}

// Compact tab bar for mobile
export function CompactTabBar(props: TabBarProps) {
  return (
    <div className="flex items-center bg-background border-b px-2 py-1">
      <div className="flex items-center gap-1 overflow-x-auto">
        {props.tabs.slice(0, 3).map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "px-2 py-1 text-xs rounded-sm cursor-pointer whitespace-nowrap",
              tab.id === props.activeTabId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
            onClick={() => props.onTabClick(tab.id)}
          >
            {tab.title}
          </div>
        ))}

        {props.tabs.length > 3 && (
          <div className="px-2 py-1 text-xs text-muted-foreground">
            +{props.tabs.length - 3} more
          </div>
        )}
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={props.onAddTab}
        className="h-6 w-6 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Tab bar with drag and drop support (future enhancement)
export function DraggableTabBar(props: TabBarProps) {
  // For future implementation of drag and drop tab reordering
  return <TabBar {...props} />;
}