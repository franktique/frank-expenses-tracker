"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Trash2, Plus, Check, GripVertical, Eye, EyeOff } from "lucide-react";
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
  totalIncome: number;
  isLoading?: boolean;
  onDeleteClick?: () => void;
  isInAddMode?: boolean;
  onAddCategories?: (subgroupId: string) => void;
  onDoneAddingCategories?: (subgroupId: string) => void;
  onCancelAddingCategories?: (subgroupId: string) => void;
  canAddCategories?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, position: "before" | "after") => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isVisible?: boolean;
  onToggleVisibility?: (subgroupId: string) => void;
}

export function SubgroupHeaderRow({
  subgroupId,
  subgroupName,
  isExpanded,
  onToggleExpand,
  onDelete,
  subtotals,
  categoryCount,
  totalIncome,
  isLoading = false,
  onDeleteClick,
  isInAddMode = false,
  onAddCategories,
  onDoneAddingCategories,
  onCancelAddingCategories,
  canAddCategories = true,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isVisible = true,
  onToggleVisibility,
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

  const handleVisibilityClick = () => {
    if (onToggleVisibility) {
      onToggleVisibility(subgroupId);
    }
  };

  const handleDropClick = (position: "before" | "after") => {
    return (e: React.DragEvent) => {
      if (onDrop) {
        onDrop(e, position);
      }
    };
  };

  // Calculate percentages
  const grossTotal = subtotals.efectivoAmount + subtotals.creditoAmount;
  const ahorroEsperadoPercentage =
    grossTotal > 0
      ? ((subtotals.expectedSavings / grossTotal) * 100)
      : 0;

  const totalPercentage =
    totalIncome > 0
      ? ((subtotals.total / totalIncome) * 100)
      : 0;

  // Format percentage with 2 decimal places
  const formatPercentage = (percentage: number): string => {
    if (percentage === 0) return "0%";
    if (percentage < 0.01) return "< 0.01%";
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <TableRow
      draggable={!isInAddMode}
      className={`group font-medium transition-all ${
        !isVisible ? "bg-gray-200 dark:bg-gray-800 opacity-60 line-through" : "bg-accent/50 hover:bg-accent/70"
      } ${
        isDragging ? "opacity-50 bg-accent" : ""
      } ${isDragOver ? "bg-blue-50 dark:bg-blue-950" : ""}`}
      data-testid={`subgroup-header-${subgroupId}`}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDropClick("before")}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle Icon */}
      <TableCell className="w-8 pl-2">
        {!isInAddMode && (
          <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TableCell>

      {/* Sub-group Name with Expand/Collapse Icon */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 flex-shrink-0"
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
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold">
            {formatCurrency(subtotals.expectedSavings)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatPercentage(ahorroEsperadoPercentage)}
          </span>
        </div>
      </TableCell>

      {/* Total */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold">
            {formatCurrency(subtotals.total)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatPercentage(totalPercentage)}
          </span>
        </div>
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
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
              onClick={handleVisibilityClick}
              disabled={isLoading}
              aria-label={isVisible ? `Hide sub-group ${subgroupName}` : `Show sub-group ${subgroupName}`}
              title={isVisible ? "Hide sub-group" : "Show sub-group"}
            >
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
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
