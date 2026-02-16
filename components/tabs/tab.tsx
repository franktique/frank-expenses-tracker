'use client';

import React, { useRef, useCallback } from 'react';
import { X, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabProps } from '@/types/tabs';

export function Tab({
  tab,
  isActive,
  onClick,
  onClose,
  onPin,
  onContextMenu,
  showCloseButton,
  isDragging = false,
}: TabProps) {
  const tabRef = useRef<HTMLDivElement>(null);

  // Handle click events
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isActive) {
        onClick();
      }
    },
    [isActive, onClick]
  );

  // Handle close button click
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Handle pin button click
  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onPin();
    },
    [onPin]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e);
    },
    [onContextMenu]
  );

  // Handle middle click (close tab)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && showCloseButton) {
        // Middle mouse button
        e.preventDefault();
        onClose();
      }
    },
    [onClose, showCloseButton]
  );

  // Safely render icon - simplified approach
  const renderIcon = () => {
    // For now, let's skip icons to avoid any rendering issues
    // We can add icons back once the basic functionality works
    return null;

    /* This is the original icon rendering code that we can restore later:
    if (!tab.icon) return null;

    try {
      const Icon = tab.icon;
      if (typeof Icon === 'function') {
        return (
          <Icon className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-primary" : "text-muted-foreground"
          )} />
        );
      }
    } catch (error) {
      console.warn('Failed to render tab icon:', error);
    }

    return null;
    */
  };

  return (
    <div
      ref={tabRef}
      className={cn(
        // Base styles
        'group relative flex items-center gap-2 border-b-2 border-transparent px-3 py-2',
        'cursor-pointer select-none transition-all duration-200',
        'min-w-0 max-w-64', // Constrain width but allow flexibility

        // Hover states
        'hover:bg-accent/50',

        // Active state
        isActive && ['border-primary bg-background', 'shadow-sm'],

        // Dragging state
        isDragging && ['opacity-50', 'cursor-grabbing'],

        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        'focus-visible:ring-2 focus-visible:ring-primary/20'
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-panel-${tab.id}`}
      aria-label={`Tab: ${tab.title}`}
      tabIndex={isActive ? 0 : -1}
      draggable={false}
    >
      {/* Pin indicator */}
      {tab.isPinned && <Pin className="h-3 w-3 text-muted-foreground/70" />}

      {/* Tab icon */}
      {renderIcon()}

      {/* Tab title */}
      <span
        className={cn(
          'truncate text-sm font-medium',
          isActive ? 'text-foreground' : 'text-muted-foreground',
          tab.isModified && 'font-semibold'
        )}
      >
        {tab.title}
      </span>

      {/* Modified indicator */}
      {tab.isModified && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Pin/Unpin button */}
      <button
        onClick={handlePin}
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded',
          'opacity-0 transition-opacity group-hover:opacity-100',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary'
        )}
        title={tab.isPinned ? 'Unpin tab' : 'Pin tab'}
        aria-label={tab.isPinned ? 'Unpin tab' : 'Pin tab'}
        type="button"
      >
        {tab.isPinned ? (
          <PinOff className="h-3 w-3" />
        ) : (
          <Pin className="h-3 w-3" />
        )}
      </button>

      {/* Close button */}
      {showCloseButton && !tab.isPinned && (
        <button
          onClick={handleClose}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-sm',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-destructive hover:text-destructive-foreground',
            'focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-destructive',
            'text-muted-foreground'
          )}
          title="Close tab"
          aria-label="Close tab"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Active indicator line at bottom */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-sm bg-primary" />
      )}
    </div>
  );
}

// Tab component with additional features
export function EnhancedTab(
  props: TabProps & {
    showTooltip?: boolean;
    keyboardShortcut?: string;
  }
) {
  const { showTooltip = true, keyboardShortcut, ...tabProps } = props;

  return (
    <div className="relative">
      <Tab {...tabProps} />

      {/* Tooltip */}
      {showTooltip && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 transform whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          {tabProps.tab.title}
          {keyboardShortcut && (
            <span className="ml-2 text-muted-foreground">
              ({keyboardShortcut})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized tab types
export function PinnedTab(props: Omit<TabProps, 'showCloseButton'>) {
  return <Tab {...props} showCloseButton={false} />;
}

export function ClosableTab(props: TabProps) {
  return <Tab {...props} showCloseButton={true} />;
}

export function SystemTab(
  props: Omit<TabProps, 'showCloseButton' | 'isClosable'>
) {
  return <Tab {...props} showCloseButton={false} />;
}
