"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Subtotals } from "@/lib/subgroup-calculations";

interface SubgroupHeaderRowProps {
  subgroupId: string;
  subgroupName: string;
  isExpanded: boolean;
  onToggleExpand: (subgroupId: string) => void;
  onDelete: (subgroupId: string) => void;
  subtotals: Subtotals;
  categoryCount: number;
  isLoading?: boolean;
  onDeleteClick?: () => void;
}

export function SubgroupHeaderRow({
  subgroupId,
  subgroupName,
  isExpanded,
  onToggleExpand,
  onDelete,
  subtotals,
  categoryCount,
  isLoading = false,
  onDeleteClick,
}: SubgroupHeaderRowProps) {
  const handleDeleteClick = () => {
    if (onDeleteClick) {
      onDeleteClick();
    } else {
      onDelete(subgroupId);
    }
  };

  return (
    <TableRow
      className="bg-accent/50 hover:bg-accent/70 font-medium"
      data-testid={`subgroup-header-${subgroupId}`}
    >
      {/* Expand/Collapse Icon */}
      <TableCell className="w-8 pl-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => onToggleExpand(subgroupId)}
          disabled={isLoading}
          aria-label={isExpanded ? "Collapse sub-group" : "Expand sub-group"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </TableCell>

      {/* Sub-group Name */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{subgroupName}</span>
          <span className="text-xs text-muted-foreground">
            ({categoryCount})
          </span>
        </div>
      </TableCell>

      {/* Tipo Gasto Column */}
      <TableCell>
        <span className="text-muted-foreground text-sm">-</span>
      </TableCell>

      {/* Efectivo Amount */}
      <TableCell className="text-right">
        <span className="text-sm font-semibold">
          {formatCurrency(subtotals.efectivoAmount)}
        </span>
      </TableCell>

      {/* Credito Amount */}
      <TableCell className="text-right">
        <span className="text-sm font-semibold">
          {formatCurrency(subtotals.creditoAmount)}
        </span>
      </TableCell>

      {/* Expected Savings */}
      <TableCell className="text-right">
        <span className="text-sm font-semibold">
          {formatCurrency(subtotals.expectedSavings)}
        </span>
      </TableCell>

      {/* Total */}
      <TableCell className="text-right">
        <span className="text-sm font-semibold">
          {formatCurrency(subtotals.total)}
        </span>
      </TableCell>

      {/* Balance */}
      <TableCell className="text-right">
        <span className="text-muted-foreground">-</span>
      </TableCell>

      {/* Delete Button */}
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          onClick={handleDeleteClick}
          disabled={isLoading}
          aria-label={`Delete sub-group ${subgroupName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
