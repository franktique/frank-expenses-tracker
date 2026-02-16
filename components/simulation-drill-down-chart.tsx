'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
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
  PieChart,
  Pie,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  RefreshCw,
  Target,
  Activity,
} from 'lucide-react';

// Types for drill-down data
interface CategoryDrillDownData {
  category_id: number;
  category_name: string;
  simulation_amount: number;
  historical_avg?: number;
  variance_percentage?: number;
  efectivo_amount: number;
  credito_amount: number;
}

interface PaymentMethodBreakdown {
  payment_method: string;
  amount: number;
  percentage: number;
}

interface DrillDownTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  showPaymentMethods?: boolean;
}

// Enhanced tooltip for drill-down charts
const DrillDownTooltip = memo<DrillDownTooltipProps>(
  ({ active, payload, label, showPaymentMethods = false }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0].payload;

    return (
      <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
        <p className="mb-2 font-semibold text-foreground">
          {label || data.category_name}
        </p>

        <div className="space-y-1">
          {showPaymentMethods ? (
            <>
              <p className="text-sm">
                <span className="font-medium text-blue-600">Efectivo:</span>{' '}
                {formatCurrency(data.efectivo_amount)}
              </p>
              <p className="text-sm">
                <span className="font-medium text-green-600">Crédito:</span>{' '}
                {formatCurrency(data.credito_amount)}
              </p>
              <p className="border-t pt-1 text-sm font-semibold">
                <span className="text-foreground">Total:</span>{' '}
                {formatCurrency(data.simulation_amount)}
              </p>
            </>
          ) : (
            <p className="text-sm">
              <span className="font-medium text-blue-600">Simulación:</span>{' '}
              {formatCurrency(data.simulation_amount)}
            </p>
          )}

          {data.historical_avg !== undefined && (
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">
                Promedio histórico:
              </span>{' '}
              {formatCurrency(data.historical_avg)}
            </p>
          )}

          {data.variance_percentage !== undefined && (
            <p
              className={`text-xs ${
                data.variance_percentage > 0
                  ? 'text-green-600'
                  : data.variance_percentage < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              Variación: {data.variance_percentage > 0 ? '+' : ''}
              {data.variance_percentage.toFixed(1)}%
            </p>
          )}
        </div>

        <p className="mt-2 text-xs italic text-blue-600">
          * Datos de simulación
        </p>
      </div>
    );
  }
);

DrillDownTooltip.displayName = 'DrillDownTooltip';

// Main drill-down chart component
interface SimulationDrillDownChartProps {
  simulationId: number;
  grouperId: number;
  grouperName: string;
  onBack: () => void;
  isLoading?: boolean;
}

export const SimulationDrillDownChart = memo<SimulationDrillDownChartProps>(
  ({
    simulationId,
    grouperId,
    grouperName,
    onBack,
    isLoading: externalLoading = false,
  }) => {
    const [data, setData] = useState<CategoryDrillDownData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'bar' | 'pie' | 'payment'>(
      'bar'
    );

    // Fetch drill-down data
    const fetchDrillDownData = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch simulation budgets for this grouper
        const budgetsResponse = await fetch(
          `/api/simulations/${simulationId}/budgets`
        );
        if (!budgetsResponse.ok) {
          throw new Error('Error al cargar presupuestos de simulación');
        }
        const budgetsData = await budgetsResponse.json();

        // Fetch grouper categories to filter relevant categories
        const grouperResponse = await fetch(
          `/api/groupers/${grouperId}/categories`
        );
        if (!grouperResponse.ok) {
          throw new Error('Error al cargar categorías del agrupador');
        }
        const grouperCategories = await grouperResponse.json();

        // Filter simulation budgets for this grouper's categories
        const relevantBudgets = budgetsData.filter((budget: any) =>
          grouperCategories.some(
            (cat: any) => cat.category_id === budget.category_id
          )
        );

        // Transform data for charts
        const transformedData: CategoryDrillDownData[] = relevantBudgets.map(
          (budget: any) => ({
            category_id: budget.category_id,
            category_name: budget.category_name,
            simulation_amount: budget.efectivo_amount + budget.credito_amount,
            efectivo_amount: budget.efectivo_amount,
            credito_amount: budget.credito_amount,
            historical_avg: 0, // TODO: Fetch historical data if needed
            variance_percentage: 0, // TODO: Calculate variance if historical data available
          })
        );

        setData(transformedData);
      } catch (error) {
        console.error('Error fetching drill-down data:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al cargar datos detallados';
        setError(errorMessage);

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }, [simulationId, grouperId]);

    useEffect(() => {
      fetchDrillDownData();
    }, [fetchDrillDownData]);

    // Prepare data for different chart types
    const chartData = data.filter((item) => item.simulation_amount > 0);

    const paymentMethodData = chartData.map((item) => ({
      ...item,
      efectivo_percentage:
        item.simulation_amount > 0
          ? (item.efectivo_amount / item.simulation_amount) * 100
          : 0,
      credito_percentage:
        item.simulation_amount > 0
          ? (item.credito_amount / item.simulation_amount) * 100
          : 0,
    }));

    const pieData = chartData.map((item) => ({
      name:
        item.category_name.length > 15
          ? item.category_name.substring(0, 15) + '...'
          : item.category_name,
      value: item.simulation_amount,
      category_id: item.category_id,
    }));

    const totalAmount = chartData.reduce(
      (sum, item) => sum + item.simulation_amount,
      0
    );

    // Colors for pie chart
    const pieColors = [
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
    ];

    if (externalLoading || isLoading) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Detalle de {grouperName}</CardTitle>
                <CardDescription>Análisis por categorías</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-[500px] items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Detalle de {grouperName}</CardTitle>
                <CardDescription>Error al cargar datos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-[400px] flex-col items-center justify-center space-y-4">
              <p className="font-medium text-destructive">{error}</p>
              <Button onClick={fetchDrillDownData} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (chartData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Detalle de {grouperName}</CardTitle>
                <CardDescription>No hay datos disponibles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">
                No hay presupuestos configurados para este agrupador
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with navigation and summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Detalle de {grouperName}
                  </CardTitle>
                  <CardDescription>
                    Análisis detallado por categorías y métodos de pago
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Total Simulación
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-600 text-blue-600"
                >
                  {chartData.length} categorías
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categorías</CardTitle>
            <CardDescription>
              Análisis detallado de la simulación para {grouperName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeView}
              onValueChange={(value) => setActiveView(value as any)}
            >
              <TabsList className="mb-6 grid w-full grid-cols-3">
                <TabsTrigger value="bar" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Barras
                </TabsTrigger>
                <TabsTrigger value="pie" className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Circular
                </TabsTrigger>
                <TabsTrigger
                  value="payment"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  Métodos de Pago
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bar">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="category_name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCurrency(value)}
                        fontSize={12}
                      />
                      <Tooltip content={<DrillDownTooltip />} />
                      <Legend />

                      <Bar
                        dataKey="simulation_amount"
                        name="Presupuesto Simulación"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="pie">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(1)}%)`
                        }
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={pieColors[index % pieColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value as number),
                          'Presupuesto',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="payment">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paymentMethodData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="category_name"
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
                        content={<DrillDownTooltip showPaymentMethods={true} />}
                      />
                      <Legend />

                      <Bar
                        dataKey="efectivo_amount"
                        name="Efectivo"
                        fill="#10b981"
                        stackId="payment"
                      />
                      <Bar
                        dataKey="credito_amount"
                        name="Crédito"
                        fill="#f59e0b"
                        stackId="payment"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Efectivo</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(
                  chartData.reduce((sum, item) => sum + item.efectivo_amount, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {(
                  (chartData.reduce(
                    (sum, item) => sum + item.efectivo_amount,
                    0
                  ) /
                    totalAmount) *
                  100
                ).toFixed(1)}
                % del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Total Crédito</span>
              </div>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(
                  chartData.reduce((sum, item) => sum + item.credito_amount, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {(
                  (chartData.reduce(
                    (sum, item) => sum + item.credito_amount,
                    0
                  ) /
                    totalAmount) *
                  100
                ).toFixed(1)}
                % del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Promedio por Categoría
                </span>
              </div>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(totalAmount / chartData.length)}
              </p>
              <p className="text-xs text-muted-foreground">
                Basado en {chartData.length} categorías activas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
);

SimulationDrillDownChart.displayName = 'SimulationDrillDownChart';
