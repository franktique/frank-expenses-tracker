'use client';

import React, { memo, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
// Chart animation optimization simplified to avoid circular dependencies

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number;
  isProjectiond?: boolean;
};

interface OptimizedGrouperChartProps {
  data: GrouperData[];
  projectionMode: boolean;
  showBudgets: boolean;
  maxAmount: number;
  colors: string[];
  selectedGrouper: GrouperData | null;
  onGrouperClick: (data: any) => void;
  CustomTooltip: React.ComponentType<any>;
}

// Memoized chart data transformation
const useChartData = (data: GrouperData[], showBudgets: boolean) => {
  return useMemo(() => {
    return data.map((item) => ({
      name: item.grouper_name,
      amount: item.total_amount,
      budget_amount: showBudgets ? item.budget_amount || 0 : undefined,
      ...item,
    }));
  }, [data, showBudgets]);
};

// Memoized color calculation for budget bars
const useBudgetColors = (data: GrouperData[], colors: string[]) => {
  return useMemo(() => {
    return data.map((_, index) => {
      const baseColor = colors[index % colors.length];

      // Convert hex to RGB and create a lighter, more muted version
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      };

      const rgb = hexToRgb(baseColor);
      const budgetColor = rgb
        ? `rgba(${Math.min(255, rgb.r + 40)}, ${Math.min(
            255,
            rgb.g + 40
          )}, ${Math.min(255, rgb.b + 40)}, 0.6)`
        : `${baseColor}60`;

      return { baseColor, budgetColor };
    });
  }, [data, colors]);
};

// Memoized budget bar cells
const BudgetBarCells = memo<{
  data: GrouperData[];
  budgetColors: Array<{ baseColor: string; budgetColor: string }>;
}>(({ data, budgetColors }) => {
  return (
    <>
      {data.map((_, index) => {
        const { baseColor, budgetColor } = budgetColors[index];
        return (
          <Cell
            key={`budget-cell-${index}`}
            fill={budgetColor}
            stroke={baseColor}
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        );
      })}
    </>
  );
});

BudgetBarCells.displayName = 'BudgetBarCells';

// Memoized main bar cells
const MainBarCells = memo<{
  data: GrouperData[];
  colors: string[];
  projectionMode: boolean;
  selectedGrouper: GrouperData | null;
}>(({ data, colors, projectionMode, selectedGrouper }) => {
  return (
    <>
      {data.map((entry, index) => {
        const baseColor = colors[index % colors.length];
        const isSelected = selectedGrouper?.grouper_id === entry.grouper_id;

        // Enhanced projection styling
        if (projectionMode) {
          return (
            <Cell
              key={`main-cell-${index}`}
              fill={isSelected ? '#ff6361' : `${baseColor}B3`} // 70% opacity in projection mode
              stroke={baseColor}
              strokeWidth={2}
              strokeDasharray="5 3" // Dashed pattern for projection
            />
          );
        }

        return (
          <Cell
            key={`main-cell-${index}`}
            fill={isSelected ? '#ff6361' : baseColor}
          />
        );
      })}
    </>
  );
});

MainBarCells.displayName = 'MainBarCells';

// Memoized label formatter
const useLabelFormatter = (projectionMode: boolean) => {
  return useCallback(
    (value: number) => {
      if (projectionMode) {
        return `Presupuesto: ${formatCurrency(value)}`;
      }
      return `Gastos: ${formatCurrency(value)}`;
    },
    [projectionMode]
  );
};

// Memoized budget label formatter
const budgetLabelFormatter = (value: number) =>
  value > 0 ? `Presup: ${formatCurrency(value)}` : '';

// Main optimized chart component with enhanced performance and deep comparison
export const OptimizedGrouperChart = memo<OptimizedGrouperChartProps>(
  ({
    data,
    projectionMode,
    showBudgets,
    maxAmount,
    colors,
    selectedGrouper,
    onGrouperClick,
    CustomTooltip,
  }) => {
    const chartData = useChartData(data, showBudgets);
    const budgetColors = useBudgetColors(data, colors);
    const labelFormatter = useLabelFormatter(projectionMode);

    // Simplified animation configuration
    const animationConfig = useMemo(
      () => ({
        duration: data.length > 30 || projectionMode ? 0 : 300,
        easing: 'ease-out',
        delay: 0,
        stagger: 0,
      }),
      [data.length, projectionMode]
    );

    // Memoized chart configuration with enhanced animation optimization
    const chartConfig = useMemo(
      () => ({
        layout: 'vertical' as const,
        margin: { top: 10, right: 120, left: 120, bottom: 10 },
        // Use optimized animation configuration
        animationDuration: 0,
      }),
      []
    );

    // Memoized axis configuration
    const xAxisConfig = useMemo(
      () => ({
        type: 'number' as const,
        domain: [0, maxAmount],
        tickFormatter: formatCurrency,
        // Optimize tick count for performance
        tickCount: Math.min(5, Math.max(3, Math.floor(maxAmount / 1000000))),
      }),
      [maxAmount]
    );

    const yAxisConfig = useMemo(
      () => ({
        dataKey: 'name',
        type: 'category' as const,
        width: 150,
        tick: { fontSize: 12 },
        interval: 0,
        // Optimize text rendering
        textAnchor: 'end' as const,
      }),
      []
    );

    // Memoized bar configurations with enhanced performance optimizations
    const budgetBarConfig = useMemo(
      () => ({
        dataKey: 'budget_amount',
        name: 'Presupuesto',
        opacity: 0.5,
        animationBegin: 50,
        animationDuration: animationConfig.duration,
        isAnimationActive: animationConfig.duration > 0,
      }),
      [animationConfig]
    );

    const mainBarConfig = useMemo(
      () => ({
        dataKey: 'amount',
        name: projectionMode ? 'Presupuesto' : 'Gastos',
        onClick: onGrouperClick,
        cursor: 'pointer' as const,
        opacity: projectionMode ? 0.7 : 1,
        animationBegin: 0,
        animationDuration: animationConfig.duration,
        isAnimationActive: animationConfig.duration > 0,
      }),
      [projectionMode, onGrouperClick, animationConfig]
    );

    // Memoized label styles
    const budgetLabelStyle = useMemo(
      () => ({
        fontSize: '11px',
        fill: '#475569',
        fontWeight: '600',
        fontStyle: 'italic',
      }),
      []
    );

    const mainLabelStyle = useMemo(
      () => ({
        fontSize: '11px',
        fontWeight: '600',
        fontStyle: projectionMode ? 'italic' : 'normal',
        fill: projectionMode ? '#6366f1' : '#374151',
      }),
      [projectionMode]
    );

    // Memoized grid configuration for performance
    const gridConfig = useMemo(
      () => ({
        strokeDasharray: '3 3',
        stroke: '#e2e8f0',
        strokeOpacity: 0.5,
      }),
      []
    );

    return (
      <div className="mt-4 h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} {...chartConfig}>
            <CartesianGrid {...gridConfig} />
            <XAxis {...xAxisConfig} />
            <YAxis {...yAxisConfig} />
            <Tooltip
              content={<CustomTooltip />}
              animationDuration={animationConfig.duration > 0 ? 150 : 0}
              isAnimationActive={animationConfig.duration > 0}
            />

            {/* Budget bars - shown first so they appear behind expense bars */}
            {showBudgets && (
              <Bar {...budgetBarConfig}>
                <BudgetBarCells data={data} budgetColors={budgetColors} />
                <LabelList
                  dataKey="budget_amount"
                  position="right"
                  formatter={budgetLabelFormatter}
                  style={budgetLabelStyle}
                />
              </Bar>
            )}

            {/* Main data bars - expenses or projectiond budget data */}
            <Bar {...mainBarConfig}>
              <MainBarCells
                data={data}
                colors={colors}
                projectionMode={projectionMode}
                selectedGrouper={selectedGrouper}
              />
              <LabelList
                dataKey="amount"
                position="right"
                formatter={labelFormatter}
                style={mainLabelStyle}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

OptimizedGrouperChart.displayName = 'OptimizedGrouperChart';

// Enhanced memo comparison function for better performance with optimized checks
const arePropsEqual = (
  prevProps: OptimizedGrouperChartProps,
  nextProps: OptimizedGrouperChartProps
): boolean => {
  // Quick reference equality checks first (most common changes)
  if (
    prevProps.projectionMode !== nextProps.projectionMode ||
    prevProps.showBudgets !== nextProps.showBudgets ||
    prevProps.maxAmount !== nextProps.maxAmount ||
    prevProps.CustomTooltip !== nextProps.CustomTooltip ||
    prevProps.onGrouperClick !== nextProps.onGrouperClick
  ) {
    return false;
  }

  // Early return for empty data arrays
  if (prevProps.data.length === 0 && nextProps.data.length === 0) {
    return true;
  }

  // Deep comparison for data array with optimized checks
  if (prevProps.data.length !== nextProps.data.length) {
    return false;
  }

  // Use hash comparison for large datasets to improve performance
  if (prevProps.data.length > 20) {
    const prevHash = prevProps.data
      .map(
        (item) =>
          `${item.grouper_id}-${item.total_amount}-${item.budget_amount || 0}`
      )
      .join('|');
    const nextHash = nextProps.data
      .map(
        (item) =>
          `${item.grouper_id}-${item.total_amount}-${item.budget_amount || 0}`
      )
      .join('|');

    if (prevHash !== nextHash) {
      return false;
    }
  } else {
    // Detailed comparison for smaller datasets
    for (let i = 0; i < prevProps.data.length; i++) {
      const prev = prevProps.data[i];
      const next = nextProps.data[i];

      if (
        prev.grouper_id !== next.grouper_id ||
        prev.grouper_name !== next.grouper_name ||
        prev.total_amount !== next.total_amount ||
        prev.budget_amount !== next.budget_amount ||
        prev.isProjectiond !== next.isProjectiond
      ) {
        return false;
      }
    }
  }

  // Optimized colors array comparison
  if (prevProps.colors.length !== nextProps.colors.length) {
    return false;
  }

  // Only compare colors if they're actually used (first few colors)
  const colorsToCheck = Math.min(
    prevProps.colors.length,
    prevProps.data.length
  );
  for (let i = 0; i < colorsToCheck; i++) {
    if (prevProps.colors[i] !== nextProps.colors[i]) {
      return false;
    }
  }

  // Compare selected grouper with null safety
  const prevSelectedId = prevProps.selectedGrouper?.grouper_id;
  const nextSelectedId = nextProps.selectedGrouper?.grouper_id;

  if (prevSelectedId !== nextSelectedId) {
    return false;
  }

  return true;
};

// Re-export with enhanced comparison
export const MemoizedOptimizedGrouperChart = memo(
  OptimizedGrouperChart,
  arePropsEqual
);
