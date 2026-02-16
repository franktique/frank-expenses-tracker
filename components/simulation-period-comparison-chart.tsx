'use client';

import React, { memo, useMemo } from 'react';
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
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

// Types for period comparison with simulation
interface PeriodData {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
    budget_amount?: number;
  }[];
}

interface SimulationPeriodData {
  period_name: string;
  is_simulation: boolean;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
  }[];
}

interface TransformedPeriodData {
  period_name: string;
  is_simulation?: boolean;
  [key: string]: number | boolean | string | undefined;
}

interface PeriodComparisonTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  grouperNames?: { [key: string]: string };
}

// Enhanced tooltip for period comparison with simulation
const PeriodComparisonTooltip = memo<PeriodComparisonTooltipProps>(
  ({ active, payload, label, grouperNames = {} }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const isSimulation = payload[0]?.payload?.is_simulation;

    return (
      <div className="max-w-sm rounded-lg border border-border bg-background p-3 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <p className="font-semibold text-foreground">{label}</p>
          {isSimulation && (
            <Badge
              variant="outline"
              className="border-blue-600 text-xs text-blue-600"
            >
              Simulación
            </Badge>
          )}
        </div>

        <div className="max-h-48 space-y-1 overflow-y-auto">
          {payload
            .filter((entry) => entry.value > 0)
            .sort((a, b) => (b.value as number) - (a.value as number))
            .slice(0, 8) // Show top 8 groupers
            .map((entry, index) => {
              const grouperKey = entry.dataKey as string;
              const grouperName =
                grouperNames[grouperKey] ||
                grouperKey.replace('grouper_', 'Agrupador ');

              return (
                <p
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span
                      className="max-w-[120px] truncate"
                      title={grouperName}
                    >
                      {grouperName}
                    </span>
                  </span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(entry.value as number)}
                  </span>
                </p>
              );
            })}

          {payload.filter((entry) => entry.value > 0).length > 8 && (
            <p className="text-xs italic text-muted-foreground">
              ... y {payload.filter((entry) => entry.value > 0).length - 8} más
            </p>
          )}
        </div>

        {isSimulation && (
          <p className="mt-2 border-t pt-2 text-xs italic text-blue-600">
            * Datos de simulación basados en presupuestos configurados
          </p>
        )}
      </div>
    );
  }
);

PeriodComparisonTooltip.displayName = 'PeriodComparisonTooltip';

// Main period comparison chart with simulation
interface SimulationPeriodComparisonChartProps {
  historicalData: PeriodData[];
  simulationData?: SimulationPeriodData;
  selectedGroupers?: number[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  showVarianceIndicators?: boolean;
}

export const SimulationPeriodComparisonChart =
  memo<SimulationPeriodComparisonChartProps>(
    ({
      historicalData,
      simulationData,
      selectedGroupers = [],
      title = 'Comparación de Períodos con Simulación',
      description = 'Análisis histórico vs simulación por períodos',
      isLoading = false,
      showVarianceIndicators = true,
    }) => {
      // Transform data for chart display
      const { chartData, grouperNames, colors, varianceData } = useMemo(() => {
        // Get all unique groupers from historical and simulation data
        const allGroupers = new Map<number, string>();

        // Add groupers from historical data
        historicalData.forEach((period) => {
          period.grouper_data.forEach((grouper) => {
            allGroupers.set(grouper.grouper_id, grouper.grouper_name);
          });
        });

        // Add groupers from simulation data
        if (simulationData) {
          simulationData.grouper_data.forEach((grouper) => {
            allGroupers.set(grouper.grouper_id, grouper.grouper_name);
          });
        }

        // Filter by selected groupers if specified
        const filteredGroupers =
          selectedGroupers.length > 0
            ? Array.from(allGroupers.entries()).filter(([id]) =>
                selectedGroupers.includes(id)
              )
            : Array.from(allGroupers.entries());

        // Create grouper names mapping for tooltip
        const grouperNamesMap: { [key: string]: string } = {};
        filteredGroupers.forEach(([id, name]) => {
          grouperNamesMap[`grouper_${id}`] = name;
        });

        // Transform historical data
        const transformedHistorical: TransformedPeriodData[] =
          historicalData.map((period) => {
            const transformed: TransformedPeriodData = {
              period_name: period.period_name,
              is_simulation: false,
            };

            filteredGroupers.forEach(([grouperId]) => {
              const grouperData = period.grouper_data.find(
                (g) => g.grouper_id === grouperId
              );
              transformed[`grouper_${grouperId}`] =
                grouperData?.total_amount || 0;
            });

            return transformed;
          });

        // Transform simulation data if provided
        let transformedSimulation: TransformedPeriodData | null = null;
        if (simulationData) {
          transformedSimulation = {
            period_name: simulationData.period_name,
            is_simulation: true,
          };

          filteredGroupers.forEach(([grouperId]) => {
            const grouperData = simulationData.grouper_data.find(
              (g) => g.grouper_id === grouperId
            );
            transformedSimulation![`grouper_${grouperId}`] =
              grouperData?.total_amount || 0;
          });
        }

        // Combine all data
        const allChartData = [...transformedHistorical];
        if (transformedSimulation) {
          allChartData.push(transformedSimulation);
        }

        // Generate colors for groupers
        const colorPalette = [
          '#8884d8',
          '#83a6ed',
          '#8dd1e1',
          '#82ca9d',
          '#a4de6c',
          '#d0ed57',
          '#ffc658',
          '#ff8042',
          '#ff6361',
          '#bc5090',
          '#58508d',
          '#003f5c',
          '#2f4b7c',
          '#665191',
          '#a05195',
          '#d45087',
          '#f95d6a',
          '#ff7c43',
          '#ffa600',
        ];

        const grouperColors: { [key: string]: string } = {};
        filteredGroupers.forEach(([grouperId], index) => {
          grouperColors[`grouper_${grouperId}`] =
            colorPalette[index % colorPalette.length];
        });

        // Calculate variance data for indicators
        const variance: Array<{
          grouper_id: number;
          grouper_name: string;
          historical_avg: number;
          simulation_value: number;
          variance_percentage: number;
          trend: 'increase' | 'decrease' | 'stable';
        }> = [];

        if (transformedSimulation && transformedHistorical.length > 0) {
          filteredGroupers.forEach(([grouperId, grouperName]) => {
            const grouperKey = `grouper_${grouperId}`;

            // Calculate historical average
            const historicalValues = transformedHistorical
              .map((period) => (period[grouperKey] as number) || 0)
              .filter((value) => value > 0);

            if (historicalValues.length > 0) {
              const historicalAvg =
                historicalValues.reduce((sum, val) => sum + val, 0) /
                historicalValues.length;
              const simulationValue =
                (transformedSimulation[grouperKey] as number) || 0;

              if (simulationValue > 0) {
                const variancePercentage =
                  ((simulationValue - historicalAvg) / historicalAvg) * 100;

                let trend: 'increase' | 'decrease' | 'stable' = 'stable';
                if (Math.abs(variancePercentage) > 10) {
                  // 10% threshold for significance
                  trend = variancePercentage > 0 ? 'increase' : 'decrease';
                }

                variance.push({
                  grouper_id: grouperId,
                  grouper_name: grouperName,
                  historical_avg: historicalAvg,
                  simulation_value: simulationValue,
                  variance_percentage: variancePercentage,
                  trend,
                });
              }
            }
          });
        }

        return {
          chartData: allChartData,
          grouperNames: grouperNamesMap,
          colors: grouperColors,
          varianceData: variance,
        };
      }, [historicalData, simulationData, selectedGroupers]);

      if (isLoading) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[500px] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        );
      }

      if (chartData.length === 0) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[500px] items-center justify-center">
                <p className="text-muted-foreground">
                  No hay datos disponibles para mostrar
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
              {simulationData && (
                <Badge
                  variant="outline"
                  className="border-blue-600 text-blue-600"
                >
                  Incluye Simulación
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] w-full">
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
                    dataKey="period_name"
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
                    content={
                      <PeriodComparisonTooltip grouperNames={grouperNames} />
                    }
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />

                  {/* Render bars for each grouper */}
                  {Object.entries(grouperNames).map(
                    ([grouperKey, grouperName]) => (
                      <Bar
                        key={grouperKey}
                        dataKey={grouperKey}
                        name={
                          grouperName.length > 20
                            ? grouperName.substring(0, 20) + '...'
                            : grouperName
                        }
                        fill={colors[grouperKey]}
                        stackId="groupers"
                      />
                    )
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Variance indicators */}
            {showVarianceIndicators && varianceData.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-medium">
                    Variaciones Significativas ({'>'}10%)
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {varianceData
                    .filter((item) => Math.abs(item.variance_percentage) > 10)
                    .sort(
                      (a, b) =>
                        Math.abs(b.variance_percentage) -
                        Math.abs(a.variance_percentage)
                    )
                    .slice(0, 6) // Show top 6 variations
                    .map((item) => (
                      <div
                        key={item.grouper_id}
                        className="flex items-center justify-between rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-center gap-2">
                          {item.trend === 'increase' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : item.trend === 'decrease' ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-gray-500" />
                          )}
                          <span
                            className="max-w-[120px] truncate text-sm font-medium"
                            title={item.grouper_name}
                          >
                            {item.grouper_name}
                          </span>
                        </div>
                        <Badge
                          variant={
                            item.trend === 'increase'
                              ? 'default'
                              : item.trend === 'decrease'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {item.variance_percentage > 0 ? '+' : ''}
                          {item.variance_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </div>

                {varianceData.filter(
                  (item) => Math.abs(item.variance_percentage) > 10
                ).length === 0 && (
                  <p className="text-sm italic text-muted-foreground">
                    No se detectaron variaciones significativas entre la
                    simulación y el promedio histórico.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
  );

SimulationPeriodComparisonChart.displayName = 'SimulationPeriodComparisonChart';
