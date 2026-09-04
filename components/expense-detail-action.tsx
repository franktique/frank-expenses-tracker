'use client';

import { useState } from 'react';
import { Camera, List } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import type { Expense } from '@/types/funds';

interface ExpenseDetailActionProps {
  expense: Expense;
  onOpenDetail: () => void;
  onScanFromImage: () => void;
}

/**
 * Per-row detail button of the expenses table. Green when the expense has
 * saved details; gray (plus a hover pop-up offering to load them from a
 * receipt image) when it does not.
 */
export function ExpenseDetailAction({
  expense,
  onOpenDetail,
  onScanFromImage,
}: ExpenseDetailActionProps) {
  const hasDetails = expense.has_details === true;
  const [hoverOpen, setHoverOpen] = useState(false);

  const button = (
    <Button
      variant="ghost"
      size="sm"
      componentId={`expenses-detail-btn-${expense.id}`}
      aria-label="Detalle de ítems"
      className={
        hasDetails
          ? 'text-green-600 hover:text-green-700 dark:text-green-400'
          : 'text-muted-foreground'
      }
      title={hasDetails ? 'Ver detalle de ítems' : 'Sin detalle de ítems'}
      onClick={onOpenDetail}
      {...(hasDetails
        ? {}
        : {
            onMouseEnter: () => setHoverOpen(true),
            onMouseLeave: () => setHoverOpen(false),
          })}
    >
      <List className="h-4 w-4" />
    </Button>
  );

  if (hasDetails) return button;

  return (
    <HoverCard
      open={hoverOpen}
      openDelay={120}
      closeDelay={120}
      onOpenChange={setHoverOpen}
    >
      <HoverCardTrigger asChild>{button}</HoverCardTrigger>
      <HoverCardContent side="left" align="center" className="w-64 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Este gasto todavía no tiene detalle de ítems.
          </p>
          <Button
            variant="outline"
            size="sm"
            componentId="expenses-detail-scan-btn"
            className="w-full justify-start"
            onClick={() => {
              setHoverOpen(false);
              onScanFromImage();
            }}
          >
            <Camera className="mr-2 h-4 w-4" />
            Cargar detalle desde imagen
          </Button>
          <p className="text-xs text-muted-foreground">
            Clic en el ícono para cargarlo manualmente.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
