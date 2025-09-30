"use client";

import React, { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Types for simulation data
interface SimulationChartData {
  grouper_id: number;
  grouper_name: string;
  simulation_total: number;
  historical_avg?: number;
  variance_percentage?: number;
  is_simulation: boolean;
}

interface ComparisonMetric {
  grouper_id: number;
  grouper_name: string;
  avg_historical: number;
  simulation_amount: number;
  variance_percentage: number;
  trend: "increase" | "decrease" | "stable";
}

interface SimulationTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Enhanced tooltip for simulation charts
const SimulationTooltip = memo<SimulationTooltipProps>(
  ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0].payload;
    const grouperName = data.grouper_name || label;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground mb-2">{grouperName}</p>

        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-medium text-blue-600">Simulación:</span>{" "}
            {formatCurrency(data.simulation_total)}
          </p>

          {data.historical_avg !== undefined && (
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">
                Promedio histórico:
              </span>{" "}
              {formatCurrency(data.historical_avg)}
            </p>
          )}

          {data.variance_percentage !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {data.variance_percentage > 5 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : data.variance_percentage < -5 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : (
                <Minus className="h-3 w-3 text-gray-500" />
              )}
              <span
                className={`font-medium ${
                  data.variance_percentage > 5
                    ? "text-green-600"
                    : data.variance_percentage < -5
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {data.variance_percentage > 0 ? "+" : ""}
                {data.variance_percentage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-blue-600 italic mt-2">
          * Datos de simulación
        </p>
      </div>
    );
  }
);

SimulationTooltip.displayName = "SimulationTooltip";

// Main simulation chart component
interface SimulationChartProps {
  data: SimulationChartData[];
  comparisonMetrics?: ComparisonMetric[];
  title?: string;
  description?: string;
  showComparison?: boolean;
  isLoading?: boolean;
}

export const SimulationChart = memo<SimulationChartProps>(
  ({
    data,
    comparisonMetrics,
    title = "Análisis de Simulación",
    description = "Comparación entre simulación y datos históricos",
    showComparison = true,
    isLoading = false,
  }) => {
    // Prepare chart data with both simulation and historical values
    const chartData = useMemo(() => {
      return data.map((item) => ({
        ...item,
        grouper_name_short:
          item.grouper_name.length > 15
            ? item.grouper_name.substring(0, 15) + "..."
            : item.grouper_name,
      }));
    }, [data]);

    // Color scheme for simulation vs historical data
    const getBarColor = (item: SimulationChartData, index: number) => {
      if (!showComparison || item.historical_avg === undefined) {
        return "#3b82f6"; // Blue for simulation only
      }

      // Color based on variance
      if (item.variance_percentage !== undefined) {
        if (item.variance_percentage > 5) return "#10b981"; // Green for increase
        if (item.variance_percentage < -5) return "#ef4444"; // Red for decrease
      }

      return "#6b7280"; // Gray for stable
    };

    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (data.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-[400px]">
              <p className="text-muted-foreground">
                No hay datos de simulación disponibles
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Simulación
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="grouper_name_short"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                />
                <Tooltip content={<SimulationTooltip />} />
                <Legend />

                {/* Simulation bars */}
                <Bar
                  dataKey="simulation_total"
                  name="Simulación"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry, index)}
                    />
                  ))}
                </Bar>

                {/* Historical average reference lines if comparison is enabled */}
                {showComparison &&
                  chartData.some(
                    (item) => item.historical_avg !== undefined
                  ) && (
                    <Bar
                      dataKey="historical_avg"
                      name="Promedio Histórico"
                      fill="rgba(107, 114, 128, 0.3)"
                      stroke="#6b7280"
                      strokeWidth={1}
                      radius={[2, 2, 0, 0]}
                    />
                  )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Variance indicators */}
          {showComparison &&
            comparisonMetrics &&
            comparisonMetrics.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Variaciones significativas:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {comparisonMetrics
                    .filter(
                      (metric) => Math.abs(metric.variance_percentage) > 5
                    )
                    .slice(0, 5) // Show only top 5 variations
                    .map((metric) => (
                      <Badge
                        key={metric.grouper_id}
                        variant={
                          metric.trend === "increase"
                            ? "default"
                            : metric.trend === "decrease"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {metric.grouper_name}:{" "}
                        {metric.variance_percentage > 0 ? "+" : ""}
                        {metric.variance_percentage.toFixed(1)}%
                      </Badge>
                    ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    );
  }
);

SimulationChart.displayName = "SimulationChart";

// Comparison chart showing simulation vs historical side by side
interface SimulationComparisonChartProps {
  data: SimulationChartData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export const SimulationComparisonChart = memo<SimulationComparisonChartProps>(
  ({
    data,
    title = "Comparación Simulación vs Histórico",
    description = "Análisis lado a lado de simulación y promedios históricos",
    isLoading = false,
  }) => {
    // Filter data to only show items with historical comparison
    const comparisonData = useMemo(() => {
      return data
        .filter((item) => item.historical_avg !== undefined)
        .map((item) => ({
          grouper_name:
            item.grouper_name.length > 12
              ? item.grouper_name.substring(0, 12) + "..."
              : item.grouper_name,
          simulation: item.simulation_total,
          historical: item.historical_avg || 0,
          variance: item.variance_percentage || 0,
        }));
    }, [data]);

    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (comparisonData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-[400px]">
              <p className="text-muted-foreground">
                No hay datos históricos para comparar
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="grouper_name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value as number),
                    name === "simulation" ? "Simulación" : "Promedio Histórico",
                  ]}
                  labelFormatter={(label) => `Agrupador: ${label}`}
                />
                <Legend />

                <Bar
                  dataKey="simulation"
                  name="Simulación"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="historical"
                  name="Promedio Histórico"
                  fill="#6b7280"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
);

SimulationComparisonChart.displayName = "SimulationComparisonChart";
