"use client";

import React, { memo } from "react";
import { formatCurrency } from "@/lib/utils";

interface TooltipPayload {
  value: number;
  name: string;
  dataKey: string;
  payload: {
    grouper_name?: string;
    category_name?: string;
    total_amount: number;
    budget_amount?: number;
    isSimulated?: boolean;
  };
}

interface OptimizedTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  simulateMode?: boolean;
  showBudgets?: boolean;
}

// Memoized tooltip content for grouper charts with enhanced performance
export const OptimizedGrouperTooltip = memo<OptimizedTooltipProps>(
  ({ active, payload, label, simulateMode = false, showBudgets = false }) => {
    // Early return for better performance
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0].payload;
    const grouperName = data.grouper_name || label;

    // Memoize formatted currency values to prevent recalculation
    const formattedAmount = React.useMemo(
      () => formatCurrency(data.total_amount),
      [data.total_amount]
    );

    const formattedBudgetAmount = React.useMemo(
      () =>
        data.budget_amount !== undefined
          ? formatCurrency(data.budget_amount)
          : null,
      [data.budget_amount]
    );

    // Memoize tooltip content to prevent unnecessary re-renders
    const tooltipContent = React.useMemo(() => {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{grouperName}</p>

          {simulateMode ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Presupuesto:</span>{" "}
                {formattedAmount}
              </p>
              {showBudgets && formattedBudgetAmount && (
                <p className="text-xs text-muted-foreground italic">
                  Presupuesto original: {formattedBudgetAmount}
                </p>
              )}
              <p className="text-xs text-blue-600 italic">
                * Datos simulados basados en presupuesto
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Gastos:</span>{" "}
                {formattedAmount}
              </p>
              {showBudgets && formattedBudgetAmount && (
                <p className="text-xs text-muted-foreground">
                  Presupuesto: {formattedBudgetAmount}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }, [
      grouperName,
      simulateMode,
      showBudgets,
      formattedAmount,
      formattedBudgetAmount,
    ]);

    return tooltipContent;
  },
  // Enhanced comparison function for better memoization
  (prevProps, nextProps) => {
    // Quick checks for common changes
    if (
      prevProps.active !== nextProps.active ||
      prevProps.simulateMode !== nextProps.simulateMode ||
      prevProps.showBudgets !== nextProps.showBudgets ||
      prevProps.label !== nextProps.label
    ) {
      return false;
    }

    // Deep comparison for payload data
    if (!prevProps.payload && !nextProps.payload) return true;
    if (!prevProps.payload || !nextProps.payload) return false;
    if (prevProps.payload.length !== nextProps.payload.length) return false;

    // Compare first payload item (most common case)
    if (prevProps.payload.length > 0 && nextProps.payload.length > 0) {
      const prevData = prevProps.payload[0].payload;
      const nextData = nextProps.payload[0].payload;

      return (
        prevData.total_amount === nextData.total_amount &&
        prevData.budget_amount === nextData.budget_amount &&
        prevData.grouper_name === nextData.grouper_name
      );
    }

    return true;
  }
);

OptimizedGrouperTooltip.displayName = "OptimizedGrouperTooltip";

// Memoized tooltip content for category charts with enhanced performance
export const OptimizedCategoryTooltip = memo<OptimizedTooltipProps>(
  ({ active, payload, label, simulateMode = false, showBudgets = false }) => {
    // Early return for better performance
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0].payload;
    const categoryName = data.category_name || label;

    // Memoize formatted currency values to prevent recalculation
    const formattedAmount = React.useMemo(
      () => formatCurrency(data.total_amount),
      [data.total_amount]
    );

    const formattedBudgetAmount = React.useMemo(
      () =>
        data.budget_amount !== undefined
          ? formatCurrency(data.budget_amount)
          : null,
      [data.budget_amount]
    );

    // Memoize tooltip content to prevent unnecessary re-renders
    const tooltipContent = React.useMemo(() => {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{categoryName}</p>

          {simulateMode ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Presupuesto:</span>{" "}
                {formattedAmount}
              </p>
              {showBudgets && formattedBudgetAmount && (
                <p className="text-xs text-muted-foreground italic">
                  Presupuesto original: {formattedBudgetAmount}
                </p>
              )}
              <p className="text-xs text-blue-600 italic">
                * Datos simulados basados en presupuesto
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Gastos:</span>{" "}
                {formattedAmount}
              </p>
              {showBudgets && formattedBudgetAmount && (
                <p className="text-xs text-muted-foreground">
                  Presupuesto: {formattedBudgetAmount}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }, [
      categoryName,
      simulateMode,
      showBudgets,
      formattedAmount,
      formattedBudgetAmount,
    ]);

    return tooltipContent;
  }
);

OptimizedCategoryTooltip.displayName = "OptimizedCategoryTooltip";

// Generic optimized tooltip for period comparison and weekly cumulative charts
export const OptimizedGenericTooltip = memo<{
  active?: boolean;
  payload?: any[];
  label?: string;
  simulateMode?: boolean;
  formatLabel?: (label: string) => string;
  formatValue?: (value: number, name: string) => string;
}>(
  ({
    active,
    payload,
    label,
    simulateMode = false,
    formatLabel,
    formatValue,
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const displayLabel = formatLabel ? formatLabel(label || "") : label;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
        {displayLabel && (
          <p className="font-semibold text-foreground mb-2">{displayLabel}</p>
        )}

        <div className="space-y-1">
          {payload.map((entry, index) => {
            const value = entry.value;
            const name = entry.name || entry.dataKey;
            const displayValue = formatValue
              ? formatValue(value, name)
              : formatCurrency(value);

            return (
              <p key={index} className="text-sm text-muted-foreground">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium">{name}:</span> {displayValue}
              </p>
            );
          })}
        </div>

        {simulateMode && (
          <p className="text-xs text-blue-600 italic mt-2">
            * Datos simulados basados en presupuesto
          </p>
        )}
      </div>
    );
  }
);

OptimizedGenericTooltip.displayName = "OptimizedGenericTooltip";
