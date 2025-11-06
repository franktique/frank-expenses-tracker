"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Trash2, Plus, Check } from "lucide-react";
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
  isInAddMode?: boolean;
  onAddCategories?: (subgroupId: string) => void;
  onDoneAddingCategories?: (subgroupId: string) => void;
  onCancelAddingCategories?: (subgroupId: string) => void;
  canAddCategories?: boolean;
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
  isInAddMode = false,
  onAddCategories,
  onDoneAddingCategories,
  onCancelAddingCategories,
  canAddCategories = true,
}: SubgroupHeaderRowProps) {
  const handleDeleteClick = () => {
    if (onDeleteClick) {
      onDeleteClick();
    } else {
      onDelete(subgroupId);
    }
  };

  const handleAddClick = () => {
    if (onAddCategories) {
      onAddCategories(subgroupId);
    }
  };

  const handleDoneClick = () => {
    if (onDoneAddingCategories) {
      onDoneAddingCategories(subgroupId);
    }
  };

  const handleCancelClick = () => {
    if (onCancelAddingCategories) {
      onCancelAddingCategories(subgroupId);
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

      {/* Action Buttons */}
      <TableCell className="text-right flex items-center justify-end gap-1">
        {isInAddMode ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
              onClick={handleDoneClick}
              disabled={isLoading}
              aria-label={`Done adding categories to sub-group ${subgroupName}`}
              title="Done adding categories"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900/20 dark:hover:text-gray-400"
              onClick={handleCancelClick}
              disabled={isLoading}
              aria-label={`Cancel adding categories to sub-group ${subgroupName}`}
              title="Cancel"
            >
              <span className="text-lg">×</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={handleAddClick}
              disabled={isLoading || !canAddCategories}
              aria-label={`Add categories to sub-group ${subgroupName}`}
              title="Add categories"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              onClick={handleDeleteClick}
              disabled={isLoading}
              aria-label={`Delete sub-group ${subgroupName}`}
              title="Delete sub-group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
