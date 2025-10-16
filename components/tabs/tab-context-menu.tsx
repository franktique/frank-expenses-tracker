"use client";

import React, { useRef, useEffect } from 'react';
import {
  X,
  Copy,
  Pin,
  PinOff,
  RotateCcw,
  RotateCcwIcon,
  Square,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabContextMenuProps } from '@/types/tabs';
import { cn } from '@/lib/utils';

export function TabContextMenu({
  tab,
  onClose,
  onPin,
  onUnpin,
  onDuplicate,
  onCloseOthers,
  onCloseAll,
  position
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position menu near the cursor
  const menuStyle = {
    position: 'fixed' as const,
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - 300),
    zIndex: 50,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="min-w-[200px]"
    >
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <div className="w-0 h-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          className="min-w-[200px]"
        >
          {/* Tab actions */}
          <DropdownMenuItem onClick={onClose} disabled={!tab.isClosable}>
            <X className="mr-2 h-4 w-4" />
            Close Tab
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Tab
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Pin/Unpin */}
          {tab.isPinned ? (
            <DropdownMenuItem onClick={onUnpin}>
              <PinOff className="mr-2 h-4 w-4" />
              Unpin Tab
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onPin}>
              <Pin className="mr-2 h-4 w-4" />
              Pin Tab
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Close multiple tabs */}
          <DropdownMenuItem onClick={onCloseOthers}>
            <Square className="mr-2 h-4 w-4" />
            Close Other Tabs
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onCloseAll}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Close All Tabs
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Tab info */}
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            <div>Path: {tab.path}</div>
            <div>Created: {tab.createdAt.toLocaleTimeString()}</div>
            {tab.isModified && (
              <div className="text-amber-600">Modified</div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Context menu container that handles outside clicks
export function TabContextMenuContainer({
  isOpen,
  onClose,
  ...props
}: TabContextMenuProps & {
  isOpen: boolean;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef}>
      <TabContextMenu {...props} />
    </div>
  );
}

// Tab management panel
export function TabManagementPanel({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabPin,
  onTabUnpin,
  onTabDuplicate,
  onCloseAll,
  onCloseOthers
}: {
  tabs: any[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabPin: (tabId: string) => void;
  onTabUnpin: (tabId: string) => void;
  onTabDuplicate: (tabId: string) => void;
  onCloseAll: () => void;
  onCloseOthers: (tabId: string) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tab Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCloseAll}>
            Close All
          </Button>
          <Button variant="outline" size="sm" onClick={() => activeTabId && onCloseOthers(activeTabId)}>
            Close Others
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg border",
              tab.id === activeTabId && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <tab.icon className="h-4 w-4" />}
              <span className="text-sm font-medium">{tab.title}</span>
              {tab.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
              {tab.isModified && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabSelect(tab.id)}
                className="h-6 w-6 p-0"
              >
                →
              </Button>

              {tab.isPinned ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabUnpin(tab.id)}
                  className="h-6 w-6 p-0"
                >
                  <PinOff className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabPin(tab.id)}
                  className="h-6 w-6 p-0"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTabDuplicate(tab.id)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>

              {tab.isClosable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabClose(tab.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tab quick actions component
export function TabQuickActions({
  onNewTab,
  onCloseCurrentTab,
  onRestoreTab,
  onToggleTabSystem
}: {
  onNewTab: () => void;
  onCloseCurrentTab: () => void;
  onRestoreTab: () => void;
  onToggleTabSystem: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewTab}
        title="New Tab (Ctrl+T)"
      >
        New Tab
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCloseCurrentTab}
        title="Close Tab (Ctrl+W)"
      >
        Close
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRestoreTab}
        title="Restore Last Tab"
      >
        Restore
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleTabSystem}
        title="Toggle Tab System"
      >
        Toggle Tabs
      </Button>
    </div>
  );
}