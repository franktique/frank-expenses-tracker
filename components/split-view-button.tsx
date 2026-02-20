'use client';

import React from 'react';
import { LayoutPanelLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SplitViewButtonProps {
  panelCount: 1 | 2 | 3;
  onSplitChange: (count: 1 | 2 | 3) => void;
}

export function SplitViewButton({
  panelCount,
  onSplitChange,
}: SplitViewButtonProps) {
  const isActive = panelCount > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 rounded-sm p-0',
            'hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-200',
            isActive && 'bg-accent text-accent-foreground'
          )}
          aria-pressed={isActive}
          aria-label="Vista dividida"
        >
          <LayoutPanelLeft className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSplitChange(1)}>
          {panelCount === 1 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <span className="mr-2 inline-block w-4" />
          )}
          Sin división
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSplitChange(2)}>
          {panelCount === 2 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <span className="mr-2 inline-block w-4" />
          )}
          2 paneles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSplitChange(3)}>
          {panelCount === 3 ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <span className="mr-2 inline-block w-4" />
          )}
          3 paneles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
