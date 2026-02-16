'use client';

import React, { memo, useMemo, useState } from 'react';
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
  ComposedChart,
  Area,
  AreaChart,
  ReferenceLine,
  Cell,
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  BarChart3,
  Activity,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';

// Enhanced types for period comparison with simulation
interface EnhancedPeriodData {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  is_simulation?: boolean;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
    budget_amount?: number;
    variance_from_previous?: number;
    trend?: 'up' | 'down' | 'stable';
  }[];
}

interface VarianceIndicator {
  grouper_id: number;
  grouper_name: string;
  current_value: number;
  previous_value: number;
  variance_percentage: number;
  variance_absolute: number;
  trend: 'increase' | 'decrease' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

interface TrendAnalysis {
  grouper_id: number;
  grouper_name: string;
  trend_direction: 'upward' | 'downward' | 'stable' | 'volatile';
  trend_strength: number; // 0-1 scale
  periods_analyzed: number;
  average_change: number;
  volatility_score: number;
}

// Enhanced tooltip for period comparison with detailed variance info
interface EnhancedPeriodTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  grouperNames?: { [key: string]: string };
  showVariance?: boolean;
  varianceData?: { [key: string]: VarianceIndicator };
}

const EnhancedPeriodTooltip = memo<EnhancedPeriodTooltipProps>(
  ({
    active,
    payload,
    label,
    grouperNames = {},
    showVariance = true,
    varianceData = {},
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const isSimulation = payload[0]?.payload?.is_simulation;
    const sortedPayload = payload
      .filter((entry) => entry.value > 0)
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 6); // Show top 6 groupers

    return (
      <div className="max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
        <div className="mb-3 flex items-center gap-2">
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

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {sortedPayload.map((entry, index) => {
            const grouperKey = entry.dataKey as string;
            const grouperName =
              grouperNames[grouperKey] ||
              grouperKey.replace('grouper_', 'Agrupador ');
            const variance = varianceData[grouperKey];

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span
                      className="max-w-[120px] truncate text-sm font-medium"
                      title={grouperName}
                    >
                      {grouperName}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(entry.value as number)}
                  </span>
                </div>

                {showVariance && variance && (
                  <div className="ml-5 flex items-center gap-1 text-xs">
                    {variance.trend === 'increase' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : variance.trend === 'decrease' ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : (
                      <Minus className="h-3 w-3 text-gray-500" />
                    )}
                    <span
                      className={`${
                        variance.trend === 'increase'
                          ? 'text-green-600'
                          : variance.trend === 'decrease'
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {variance.variance_percentage > 0 ? '+' : ''}
                      {variance.variance_percentage.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">
                      ({variance.variance_absolute > 0 ? '+' : ''}
                      {formatCurrency(variance.variance_absolute)})
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {payload.filter((entry) => entry.value > 0).length > 6 && (
            <p className="ml-5 text-xs italic text-muted-foreground">
              ... y {payload.filter((entry) => entry.value > 0).length - 6} más
            </p>
          )}
        </div>

        {isSimulation && (
          <p className="mt-3 border-t pt-2 text-xs italic text-blue-600">
            * Datos de simulación basados en presupuestos configurados
          </p>
        )}
      </div>
    );
  }
);

EnhancedPeriodTooltip.displayName = 'EnhancedPeriodTooltip';

// Main enhanced period comparison chart
interface EnhancedPeriodComparisonChartProps {
  data: EnhancedPeriodData[];
  selectedGroupers?: number[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  showVarianceIndicators?: boolean;
  showTrendAnalysis?: boolean;
  enableDrillDown?: boolean;
  onGrouperClick?: (grouperId: number, grouperName: string) => void;
}

export const EnhancedPeriodComparisonChart =
  memo<EnhancedPeriodComparisonChartProps>(
    ({
      data,
      selectedGroupers = [],
      title = 'Análisis Avanzado de Períodos',
      description = 'Comparación de períodos con análisis de variaciones y tendencias',
      isLoading = false,
      showVarianceIndicators = true,
      showTrendAnalysis = true,
      enableDrillDown = false,
      onGrouperClick,
    }) => {
      const [activeView, setActiveView] = useState<
        'stacked' | 'grouped' | 'trend'
      >('stacked');
      const [highlightedGrouper, setHighlightedGrouper] = useState<
        number | null
      >(null);
      const [showSimulationOnly, setShowSimulationOnly] = useState(false);

      // Transform and analyze data
      const {
        chartData,
        grouperNames,
        colors,
        varianceData,
        trendAnalysis,
        significantChanges,
      } = useMemo(() => {
        if (data.length === 0) {
          return {
            chartData: [],
            grouperNames: {},
            colors: {},
            varianceData: {},
            trendAnalysis: [],
            significantChanges: [],
          };
        }

        // Get all unique groupers
        const allGroupers = new Map<number, string>();
        data.forEach((period) => {
          period.grouper_data.forEach((grouper) => {
            allGroupers.set(grouper.grouper_id, grouper.grouper_name);
          });
        });

        // Filter by selected groupers if specified
        const filteredGroupers =
          selectedGroupers.length > 0
            ? Array.from(allGroupers.entries()).filter(([id]) =>
                selectedGroupers.includes(id)
              )
            : Array.from(allGroupers.entries());

        // Create grouper names mapping
        const grouperNamesMap: { [key: string]: string } = {};
        filteredGroupers.forEach(([id, name]) => {
          grouperNamesMap[`grouper_${id}`] = name;
        });

        // Transform data for chart
        const transformedData = data.map((period) => {
          const transformed: any = {
            period_name: period.period_name,
            is_simulation: period.is_simulation || false,
            period_id: period.period_id,
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

        // Generate colors
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
        ];

        const grouperColors: { [key: string]: string } = {};
        filteredGroupers.forEach(([grouperId], index) => {
          grouperColors[`grouper_${grouperId}`] =
            colorPalette[index % colorPalette.length];
        });

        // Calculate variance data (period-to-period changes)
        const variance: { [key: string]: VarianceIndicator } = {};
        if (transformedData.length > 1) {
          const currentPeriod = transformedData[transformedData.length - 1];
          const previousPeriod = transformedData[transformedData.length - 2];

          filteredGroupers.forEach(([grouperId, grouperName]) => {
            const grouperKey = `grouper_${grouperId}`;
            const currentValue = currentPeriod[grouperKey] || 0;
            const previousValue = previousPeriod[grouperKey] || 0;

            if (previousValue > 0) {
              const variancePercentage =
                ((currentValue - previousValue) / previousValue) * 100;
              const varianceAbsolute = currentValue - previousValue;

              let trend: 'increase' | 'decrease' | 'stable' = 'stable';
              let significance: 'high' | 'medium' | 'low' = 'low';

              if (Math.abs(variancePercentage) > 20) {
                significance = 'high';
                trend = variancePercentage > 0 ? 'increase' : 'decrease';
              } else if (Math.abs(variancePercentage) > 10) {
                significance = 'medium';
                trend = variancePercentage > 0 ? 'increase' : 'decrease';
              } else if (Math.abs(variancePercentage) > 5) {
                significance = 'low';
                trend = variancePercentage > 0 ? 'increase' : 'decrease';
              }

              variance[grouperKey] = {
                grouper_id: grouperId,
                grouper_name: grouperName,
                current_value: currentValue,
                previous_value: previousValue,
                variance_percentage: variancePercentage,
                variance_absolute: varianceAbsolute,
                trend,
                significance,
              };
            }
          });
        }

        // Calculate trend analysis (multi-period trends)
        const trends: TrendAnalysis[] = [];
        if (transformedData.length >= 3) {
          filteredGroupers.forEach(([grouperId, grouperName]) => {
            const grouperKey = `grouper_${grouperId}`;
            const values = transformedData
              .map((period) => period[grouperKey] || 0)
              .filter((v) => v > 0);

            if (values.length >= 3) {
              // Calculate trend direction and strength
              let upwardChanges = 0;
              let downwardChanges = 0;
              let totalChange = 0;
              let volatilitySum = 0;

              for (let i = 1; i < values.length; i++) {
                const change = values[i] - values[i - 1];
                const changePercentage =
                  values[i - 1] > 0 ? (change / values[i - 1]) * 100 : 0;

                if (changePercentage > 5) upwardChanges++;
                else if (changePercentage < -5) downwardChanges++;

                totalChange += changePercentage;
                volatilitySum += Math.abs(changePercentage);
              }

              const averageChange = totalChange / (values.length - 1);
              const volatilityScore = volatilitySum / (values.length - 1);

              let trendDirection:
                | 'upward'
                | 'downward'
                | 'stable'
                | 'volatile' = 'stable';
              if (volatilityScore > 25) {
                trendDirection = 'volatile';
              } else if (upwardChanges > downwardChanges && averageChange > 5) {
                trendDirection = 'upward';
              } else if (
                downwardChanges > upwardChanges &&
                averageChange < -5
              ) {
                trendDirection = 'downward';
              }

              const trendStrength = Math.min(Math.abs(averageChange) / 20, 1); // Normalize to 0-1

              trends.push({
                grouper_id: grouperId,
                grouper_name: grouperName,
                trend_direction: trendDirection,
                trend_strength: trendStrength,
                periods_analyzed: values.length,
                average_change: averageChange,
                volatility_score: volatilityScore,
              });
            }
          });
        }

        // Identify significant changes
        const significant = Object.values(variance)
          .filter((v) => v.significance === 'high')
          .sort(
            (a, b) =>
              Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage)
          )
          .slice(0, 5);

        return {
          chartData: showSimulationOnly
            ? transformedData.filter((period) => period.is_simulation)
            : transformedData,
          grouperNames: grouperNamesMap,
          colors: grouperColors,
          varianceData: variance,
          trendAnalysis: trends,
          significantChanges: significant,
        };
      }, [data, selectedGroupers, showSimulationOnly]);

      // Handle grouper click for drill-down
      const handleGrouperClick = (grouperKey: string) => {
        if (!enableDrillDown || !onGrouperClick) return;

        const grouperId = parseInt(grouperKey.replace('grouper_', ''));
        const grouperName = grouperNames[grouperKey];

        if (grouperId && grouperName) {
          onGrouperClick(grouperId, grouperName);
        }
      };

      if (isLoading) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[600px] items-center justify-center">
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
              <div className="flex h-[600px] items-center justify-center">
                <p className="text-muted-foreground">
                  No hay datos disponibles para mostrar
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="space-y-6">
          {/* Main chart card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {data.some((period) => period.is_simulation) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSimulationOnly(!showSimulationOnly)}
                    >
                      {showSimulationOnly ? (
                        <Eye className="mr-2 h-4 w-4" />
                      ) : (
                        <EyeOff className="mr-2 h-4 w-4" />
                      )}
                      {showSimulationOnly ? 'Mostrar Todo' : 'Solo Simulación'}
                    </Button>
                  )}

                  <Badge
                    variant="outline"
                    className="border-blue-600 text-blue-600"
                  >
                    {chartData.length} períodos
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs
                value={activeView}
                onValueChange={(value) => setActiveView(value as any)}
              >
                <TabsList className="mb-4 grid w-full grid-cols-3">
                  <TabsTrigger value="stacked">Apilado</TabsTrigger>
                  <TabsTrigger value="grouped">Agrupado</TabsTrigger>
                  <TabsTrigger value="trend">Tendencias</TabsTrigger>
                </TabsList>

                <TabsContent value="stacked">
                  <div className="h-[600px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                            <EnhancedPeriodTooltip
                              grouperNames={grouperNames}
                              showVariance={showVarianceIndicators}
                              varianceData={varianceData}
                            />
                          }
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

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
                              onClick={() => handleGrouperClick(grouperKey)}
                              style={{
                                cursor: enableDrillDown ? 'pointer' : 'default',
                              }}
                              opacity={
                                highlightedGrouper === null ||
                                highlightedGrouper ===
                                  parseInt(grouperKey.replace('grouper_', ''))
                                  ? 1
                                  : 0.3
                              }
                            />
                          )
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="grouped">
                  <div className="h-[600px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                            <EnhancedPeriodTooltip
                              grouperNames={grouperNames}
                              showVariance={showVarianceIndicators}
                              varianceData={varianceData}
                            />
                          }
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

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
                              onClick={() => handleGrouperClick(grouperKey)}
                              style={{
                                cursor: enableDrillDown ? 'pointer' : 'default',
                              }}
                              opacity={
                                highlightedGrouper === null ||
                                highlightedGrouper ===
                                  parseInt(grouperKey.replace('grouper_', ''))
                                  ? 1
                                  : 0.3
                              }
                            />
                          )
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="trend">
                  <div className="h-[600px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                            <EnhancedPeriodTooltip
                              grouperNames={grouperNames}
                              showVariance={showVarianceIndicators}
                              varianceData={varianceData}
                            />
                          }
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        {Object.entries(grouperNames).map(
                          ([grouperKey, grouperName]) => (
                            <Line
                              key={grouperKey}
                              type="monotone"
                              dataKey={grouperKey}
                              name={
                                grouperName.length > 20
                                  ? grouperName.substring(0, 20) + '...'
                                  : grouperName
                              }
                              stroke={colors[grouperKey]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              opacity={
                                highlightedGrouper === null ||
                                highlightedGrouper ===
                                  parseInt(grouperKey.replace('grouper_', ''))
                                  ? 1
                                  : 0.3
                              }
                            />
                          )
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Variance indicators */}
          {showVarianceIndicators && significantChanges.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">
                    Cambios Significativos
                  </CardTitle>
                </div>
                <CardDescription>
                  Variaciones importantes detectadas en el último período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {significantChanges.map((change) => (
                    <div
                      key={change.grouper_id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                      onClick={() =>
                        setHighlightedGrouper(
                          highlightedGrouper === change.grouper_id
                            ? null
                            : change.grouper_id
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        {change.trend === 'increase' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p
                            className="max-w-[120px] truncate text-sm font-medium"
                            title={change.grouper_name}
                          >
                            {change.grouper_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(change.current_value)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          change.trend === 'increase'
                            ? 'default'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {change.variance_percentage > 0 ? '+' : ''}
                        {change.variance_percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend analysis */}
          {showTrendAnalysis && trendAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">
                    Análisis de Tendencias
                  </CardTitle>
                </div>
                <CardDescription>
                  Patrones de comportamiento a lo largo de múltiples períodos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {trendAnalysis
                    .filter((trend) => trend.trend_direction !== 'stable')
                    .sort((a, b) => b.trend_strength - a.trend_strength)
                    .slice(0, 6)
                    .map((trend) => (
                      <div
                        key={trend.grouper_id}
                        className="rounded-lg border bg-card p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p
                            className="max-w-[120px] truncate text-sm font-medium"
                            title={trend.grouper_name}
                          >
                            {trend.grouper_name}
                          </p>
                          <Badge
                            variant={
                              trend.trend_direction === 'upward'
                                ? 'default'
                                : trend.trend_direction === 'downward'
                                  ? 'destructive'
                                  : trend.trend_direction === 'volatile'
                                    ? 'secondary'
                                    : 'outline'
                            }
                            className="text-xs"
                          >
                            {trend.trend_direction === 'upward'
                              ? 'Creciente'
                              : trend.trend_direction === 'downward'
                                ? 'Decreciente'
                                : trend.trend_direction === 'volatile'
                                  ? 'Volátil'
                                  : 'Estable'}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            Cambio promedio:{' '}
                            {trend.average_change > 0 ? '+' : ''}
                            {trend.average_change.toFixed(1)}%
                          </p>
                          <p>
                            Volatilidad: {trend.volatility_score.toFixed(1)}%
                          </p>
                          <p>Períodos analizados: {trend.periods_analyzed}</p>
                        </div>

                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                trend.trend_direction === 'upward'
                                  ? 'bg-green-600'
                                  : trend.trend_direction === 'downward'
                                    ? 'bg-red-600'
                                    : 'bg-amber-600'
                              }`}
                              style={{
                                width: `${trend.trend_strength * 100}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Fuerza: {(trend.trend_strength * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
  );

EnhancedPeriodComparisonChart.displayName = 'EnhancedPeriodComparisonChart';
